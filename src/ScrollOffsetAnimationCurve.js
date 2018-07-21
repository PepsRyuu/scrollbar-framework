const ScrollOffsetAnimationCurve = (function () {

    // Wrapping the component like this so that it gets properly tree-shaken.
    // Without this wrapping, things like the license could leak even when not used in the bundle.

    /**
     * Code based off the scroll_offset_animation_curve.cc from Chromium project.
     * https://chromium.googlesource.com/chromium/src/+/69.0.3476.1/cc/animation/scroll_offset_animation_curve.cc
     */

    /*!
     * Copyright 2015 The Chromium Authors. All rights reserved.
     *
     * Redistribution and use in source and binary forms, with or without
     * modification, are permitted provided that the following conditions are
     * met:
     *
     *    * Redistributions of source code must retain the above copyright
     * notice, this list of conditions and the following disclaimer.
     *    * Redistributions in binary form must reproduce the above
     * copyright notice, this list of conditions and the following disclaimer
     * in the documentation and/or other materials provided with the
     * distribution.
     *    * Neither the name of Google Inc. nor the names of its
     * contributors may be used to endorse or promote products derived from
     * this software without specific prior written permission.
     *
     * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
     * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
     * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
     * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
     * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
     * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
     * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
     * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
     * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
     * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
     * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
     */

    const kConstantDuration = 9.0;
    const kDurationDivisor = 60.0;
    const kInverseDeltaRampStartPx = 120.0;
    const kInverseDeltaRampEndPx = 480.0;
    const kInverseDeltaMinDuration = 6.0;
    const kInverseDeltaMaxDuration = 12.0;
    const kInverseDeltaSlope = (kInverseDeltaMinDuration - kInverseDeltaMaxDuration) / (kInverseDeltaRampEndPx - kInverseDeltaRampStartPx)
    const kInverseDeltaOffset = kInverseDeltaMaxDuration - kInverseDeltaRampStartPx * kInverseDeltaSlope;
    const kEpsilon = 0.01;
    const kBezierEpsilon = 1e-7;

    function MaximumDimension (delta) {
        return Math.abs(delta.x) > Math.abs(delta.y) ? delta.x : delta.y;
    }

    function EaseOutWithInitialVelocity (velocity) {
        // Clamp velocity to a sane value.
        velocity = Math.min(Math.max(velocity, -1000), 1000);

        // Based on CubicBezierTimingFunction::EaseType::EASE_IN_OUT preset
        // with first control point scaled.
        let x1 = 0.42;
        let y1 = velocity * x1;
        return new CubicBezierTimingFunction('ease-type', x1, y1, 0.58, 1);
    }

    function ScrollOffset(x, y) {
        return {x, y};
    }

    function ScrollOffsetWithDelta(offset, delta) {
        return ScrollOffset(offset.x + delta.x, offset.y + delta.y);
    }

    function tween(value, start, target) {
        return (start + (target - start) * value);
    }

    function VelocityBasedDurationBound (old_delta, old_normalized_velocity, old_duration, new_delta) {
        let old_delta_max_dimension = MaximumDimension(old_delta);
        let new_delta_max_dimension = MaximumDimension(new_delta);

        if (Math.abs(new_delta_max_dimension) < kEpsilon) {
            return 0;
        }

        if (Math.abs(old_delta_max_dimension) < kEpsilon || Math.abs(old_normalized_velocity) < kEpsilon) {
            return Number.POSITIVE_INFINITY;
        }

        let old_true_velocity = old_normalized_velocity * old_delta_max_dimension / old_duration;
        let bound = (new_delta_max_dimension / old_true_velocity) * 2.5;

        return bound < 0 ? Number.POSITIVE_INFINITY : bound;
    }


    function DeltaFrom(v1, v2) {
        return ScrollOffset(v1.x - v2.x, v1.y - v2.y);
    }


    class CubicBezier {
        constructor(p1x, p1y, p2x, p2y) {
            this.InitCoefficients(p1x, p1y, p2x, p2y);
            this.InitGradients(p1x, p1y, p2x, p2y);
            this.InitRange(p1y, p2y);
        }

        InitCoefficients(p1x, p1y, p2x, p2y) {
            this.cx = 3.0 * p1x;
            this.bx = 3.0 * (p2x - p1x) - this.cx;
            this.ax = 1.0 - this.cx - this.bx;

            this.cy = 3.0 * p1y;
            this.by = 3.0 * (p2y - p1y) - this.cy;
            this.ay = 1.0 - this.cy - this.by;
        }

        InitGradients (p1x, p1y, p2x, p2y) {
            // End-point gradients are used to calculate timing function results
            // outside the range [0, 1].
            //
            // There are three possibilities for the gradient at each end:
            // (1) the closest control point is not horizontally coincident with regard to
            //     (0, 0) or (1, 1). In this case the line between the end point and
            //     the control point is tangent to the bezier at the end point.
            // (2) the closest control point is coincident with the end point. In
            //     this case the line between the end point and the far control
            //     point is tangent to the bezier at the end point.
            // (3) the closest control point is horizontally coincident with the end
            //     point, but vertically distinct. In this case the gradient at the
            //     end point is Infinite. However, this causes issues when
            //     interpolating. As a result, we break down to a simple case of
            //     0 gradient under these conditions.

            if (p1x > 0)
                this.start_gradient = p1y / p1x;
            else if (!p1y && p2x > 0)
                this.start_gradient = p2y / p2x;
            else
                this.start_gradient = 0;

            if (p2x < 1)
                this.end_gradient = (p2y - 1) / (p2x - 1);
            else if (p2x == 1 && p1x < 1)
                this.end_gradient = (p1y - 1) / (p1x - 1);
            else
                this.end_gradient = 0;
        }

        InitRange (p1y, p2y) {
            this.range_min = 0;
            this.range_max = 1;
            if (0 <= p1y && p1y < 1 && 0 <= p2y && p2y <= 1)
                return;

            const epsilon = kBezierEpsilon;

            // Represent the function's derivative in the form at^2 + bt + c
            // as in sampleCurveDerivativeY.
            // (Technically this is (dy/dt)*(1/3), which is suitable for finding zeros
            // but does not actually give the slope of the curve.)
            const a = 3.0 * this.ay;
            const b = 2.0 * this.by;
            const c = this.c_;

            // Check if the derivative is constant.
            if (Math.abs(a) < epsilon && Math.abs(b) < epsilon)
                return;

            // Zeros of the function's derivative.
            let t1 = 0;
            let t2 = 0;

            if (Math.abs(a) < epsilon) {
                // The function's derivative is linear.
                t1 = -c / b;
            } else {
                // The function's derivative is a quadratic. We find the zeros of this
                // quadratic using the quadratic formula.
                let discriminant = b * b - 4 * a * c;
                if (discriminant < 0)
                    return;

                let discriminant_sqrt = Math.sqrt(discriminant);
                t1 = (-b + discriminant_sqrt) / (2 * a);
                t2 = (-b - discriminant_sqrt) / (2 * a);
            }

            let sol1 = 0;
            let sol2 = 0;

            // If the solution is in the range [0,1] then we include it, otherwise we
            // ignore it.

            // An interesting fact about these beziers is that they are only
            // actually evaluated in [0,1]. After that we take the tangent at that point
            // and linearly project it out.
            if (0 < t1 && t1 < 1)
                sol1 = this.SampleCurveY(t1);

            if (0 < t2 && t2 < 1)
                sol2 = this.SampleCurveY(t2);

            this.range_min = Math.min(Math.min(this.range_min, sol1), sol2);
            this.range_max = Math.max(Math.max(this.range_max, sol1), sol2);
        }

        SampleCurveY (t) {
            return ((this.ay * t + this.by) * t + this.cy) * t;
        }

        SampleCurveX (t) {
            return ((this.ax * t + this.bx) * t + this.cx) * t;
        }

        SampleCurveDerivativeX(t) {
            return (3.0 * this.ax * t + 2.0 * this.bx) * t + this.cx;
        }

        SampleCurveDerivativeY(t) {
            return (3.0 * this.ay * t + 2.0 * this.by) * t + this.cy;
        }

        GetDefaultEpsilon () {
            return kBezierEpsilon;
        }

        SolveCurveX (x, epsilon) {
            let t0;
            let t1;
            let t2;
            let x2;
            let d2;
            let i;

            // First try a few iterations of Newton's method -- normally very fast.
            for (t2 = x, i = 0; i < 8; i++) {
                x2 = this.SampleCurveX(t2) - x;

                if (Math.abs(x2) < epsilon)
                    return t2;

                d2 = this.SampleCurveDerivativeX(t2);
                
                if (Math.abs(d2) < 1e-6)
                    break;

                t2 = t2 - x2 / d2;
            }

            // Fall back to the bisection method for reliability.
            t0 = 0.0;
            t1 = 1.0;
            t2 = x;

            while (t0 < t1) {
                x2 = this.SampleCurveX(t2);
                if (Math.abs(x2 - x) < epsilon)
                    return t2;
                if (x > x2)
                    t0 = t2;
                else
                    t1 = t2;
                t2 = (t1 - t0) * 0.5 + t0;
            }

            // Failure.
            return t2;
        }

        Solve (x) {
            return this.SolveWithEpsilon(x, kBezierEpsilon);
        }

        SolveWithEpsilon(x, epsilon) {
            if (x < 0.0)
                return 0.0 + this.start_gradient * x;
            if (x > 1.0)
                return 1.0 + this.end_gradient * (x - 1.0);
            return this.SampleCurveY(this.SolveCurveX(x, epsilon));
        }

        SlopeWithEpsilon (x, epsilon) {
            x = Math.min(Math.max(x, 0.0), 1.0);
            let t = this.SolveCurveX(x, epsilon);
            let dx = this.SampleCurveDerivativeX(t);
            let dy = this.SampleCurveDerivativeY(t);
            return dy / dx;
        }

        Slope (x) {
            return this.SlopeWithEpsilon(x, kBezierEpsilon);
        }

        GetX1 () {
            return this.cx / 3.0;
        }

        GetY1 () {
            return this.cy / 3.0;
        }

        GetX2 () {
            return (this.bx + this.cx) / 3.0 + this.GetX1()
        }

        GetY2 () {
            return (this.by + this.cy) / 3.0 + this.GetY1();
        }
    }

    const DurationBehaviour = {
        CONSTANT: 0,
        DELTA_BASED: 1,
        INVERSE_DELTA: 2
    }

    class CubicBezierTimingFunction {
        constructor (ease_type, x1, y1, x2, y2) {
            this.bezier = new CubicBezier(x1, y1, x2, y2);
            this.ease_type = ease_type;
        }

        GetType () {
            return 'CUBIC_BEZIER';
        }

        GetValue (x) {
            return this.bezier.Solve(x);
        }

        Velocity(x) {
            return this.bezier.Slope(x);
        }

    }

    class AnimationCurve {
        
        constructor (target_value, timing_function, duration_behaviour = DurationBehaviour.DELTA_BASED) {
            this.initial_value = 0;
            this.target_value = target_value;
            this.total_animation_duration = 0;
            this.last_retarget = 0;
            this.timing_function = timing_function;
            this.duration_behaviour = duration_behaviour;
            this.has_set_initial_value = false;
        }

        SegmentDuration (delta, behaviour, delayed_by) {
            let duration = kConstantDuration;

            switch (behaviour) {
                case DurationBehaviour.CONSTANT: 
                    duration = kConstantDuration;
                    break;

                case DurationBehaviour.DELTA_BASED:
                    duration = Math.sqrt(Math.abs(MaximumDimension(delta)));
                    break;

                case DurationBehaviour.INVERSE_DELTA:
                    duration = Math.min(Math.max(kInverseDeltaOffset + Math.abs(MaximumDimension(delta)) * kInverseDeltaSlope, kInverseDeltaMinDuration), kInverseDeltaMaxDuration);
                    break;
            }

            let time_delta = duration / kDurationDivisor;
            time_delta -= delayed_by;

            if (time_delta >= 0) { // base delta
                return time_delta;
            }

            return 0; // base_delta
        }

        SetInitialValue (initial_value, delayed_by = 0) {// time delta for delayed by
            this.initial_value = initial_value;
            this.has_set_initial_value = true;
            this.total_animation_duration = this.SegmentDuration(DeltaFrom(this.target_value, this.initial_value), this.duration_behaviour, delayed_by);
        }

        HasSetInitialValue () {
            return this.has_set_initial_value;
        }    

        ApplyAdjustment (adjustment) {
            this.initial_value = ScrollOffsetWithDelta(this.initial_value, adjustment);
            this.target_value = ScrollOffsetWithDelta(this.target_value, adjustment);
        }

        GetValue (t) {
            let duration = this.total_animation_duration - this.last_retarget;
            t -= this.last_retarget;

            if (duration === 0) {
                return this.target_value;
            }

            if (t <= 0) // base-delta
                return this.initial_value;

            if (t >= duration) {
                return this.target_value;
            }

            let progress = this.timing_function.GetValue(t / duration);

            let x = tween(progress, this.initial_value.x, this.target_value.x);
            let y = tween(progress, this.initial_value.y, this.target_value.y);
            return ScrollOffset(x, y);
        }

        Duration () {
            return this.total_animation_duration;
        }

        UpdateTarget (t, new_target) {
            if (Math.abs(MaximumDimension(DeltaFrom(this.target_value, new_target))) < kEpsilon) {
                this.target_value = new_target;
                return;
            }

            let delayed_by = Math.max(0, this.last_retarget - t);
            t = Math.max(t, this.last_retarget);

            let current_position = this.GetValue(t);
            let old_delta = DeltaFrom(this.target_value, this.initial_value);
            let new_delta = DeltaFrom(new_target, current_position);

            if (this.total_animation_duration - this.last_retarget === 0) {
                this.total_animation_duration = this.SegmentDuration(new_delta, this.duration_behaviour, delayed_by);
                this.target_value = new_target;
                return;
            }

            let old_duration = this.total_animation_duration - this.last_retarget;
            let old_normalized_velocity = this.timing_function.Velocity((t - this.last_retarget) / old_duration);

            // Use the velocity-based duration bound when it is less than the constant
            // segment duration. This minimizes the "rubber-band" bouncing effect when
            // old_normalized_velocity is large and new_delta is small.
            let new_duration = Math.min(this.SegmentDuration(new_delta, this.duration_behaviour, delayed_by), VelocityBasedDurationBound(old_delta, old_normalized_velocity, old_duration, new_delta));

            if (new_duration < kEpsilon) {
                this.target_value = new_target;
                this.total_animation_duration = t; // TimeDelta::FromSecondsD(t);
                return;
            }

            let new_normalized_velocity = old_normalized_velocity * (new_duration / old_duration) * (MaximumDimension(old_delta) / MaximumDimension(new_delta));

            this.initial_value = current_position;
            this.target_value = new_target;
            this.total_animation_duration = t + new_duration;
            this.last_retarget = t;
            this.timing_function = EaseOutWithInitialVelocity(new_normalized_velocity);

        }
    }

    return { DurationBehaviour, AnimationCurve, CubicBezierTimingFunction};
})();

export default ScrollOffsetAnimationCurve;

