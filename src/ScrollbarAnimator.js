import ScrollOffsetAnimationCurve from './ScrollOffsetAnimationCurve.js';
import { createPrivateStore } from './utils.js';

const _ = createPrivateStore();
const { CubicBezierTimingFunction, DurationBehaviour, AnimationCurve } = ScrollOffsetAnimationCurve;

export default class ScrollbarAnimator {
    constructor (options = {}) {
        // initial, maximum, onAnimationFrame
        _(this).timing_fn = new CubicBezierTimingFunction('EASE_IN_OUT', 0.42, 0.0, 0.58, 1);
        _(this).onPositionRequest = options.onPositionRequest || (() => 0);
        _(this).onMaximumRequest = options.onMaximumRequest || (() => Number.Infinity);
        _(this).onAnimationFrame = options.onAnimationFrame || (() => {});
    }

    scroll (delta) {
        let maximum = _(this).onMaximumRequest();

        if (_(this).animating) {
            let currTime = (Date.now() - _(this).startTime) / 1000;
            _(this).target = Math.min(_(this).target + delta, maximum);
            _(this).curve.UpdateTarget(currTime, {x: 0, y: _(this).target});
        } else {
            let startPos = _(this).onPositionRequest();
            _(this).target = Math.min(startPos + delta, maximum);
            _(this).curve = new AnimationCurve({ x: 0, y: _(this).target }, _(this).timing_fn, DurationBehaviour.INVERSE_DELTA );
            _(this).startTime = Date.now();
            _(this).curve.SetInitialValue({x: 0, y: startPos});

            let loop = () => {
                let deltaTime = (Date.now() - _(this).startTime) / 1000;
                let value = _(this).curve.GetValue(deltaTime);

                _(this).onAnimationFrame(value.y);

                if (value.y === _(this).target) {
                    delete _(this).animating;
                } else {    
                    _(this).animating = requestAnimationFrame(loop);
                }
            };

            _(this).animating = requestAnimationFrame(loop);
        }
    }
}
