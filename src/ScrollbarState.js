import { createPrivateStore } from './utils.js';

const _ = createPrivateStore();

function calculateThumbSize () {
    // Thumb size represents how much space there is to scroll through.
    // For example, if there's twice the viewport to view, then thumb size will be half of the track.
    // There's a minimum however so that it's still visible when the scrollSize is large.
    _(this).thumbSize = Math.max(_(this).minThumbSize, Math.round(_(this).viewportSize / _(this).scrollSize * getTrackSize.call(this)));
}

function getTrackSize () {
    // It's the viewport, minus the buttons. 
    return (_(this).viewportSize - _(this).buttonSize * 2);
}

function getMaxThumbPosition () {
    return (getTrackSize.call(this) - _(this).thumbSize);
}

function getMaxScrollPosition () {
    // Take the scrollable height and subtract the current view, that's the max scroll position value.
    return (_(this).scrollSize - _(this).viewportSize);
}

export default class ScrollbarState {
    constructor () {
        _(this).thumbPosition = 0;
        _(this).thumbSize = 0;
        _(this).scrollPosition = 0;
        _(this).scrollSize = 0;
        _(this).viewportSize = 0;
        _(this).minThumbSize = 17;
        _(this).buttonSize = 0;
    }

    setViewportSize (size) {
        _(this).viewportSize = size;
        calculateThumbSize.call(this);
    }

    setButtonSize (size) {
        _(this).buttonSize = size;
        calculateThumbSize.call(this);
    }

    setScrollSize (size) {
        _(this).scrollSize = size;
        calculateThumbSize.call(this);
    }

    setThumbPosition (position) {
        _(this).thumbPosition = Math.max(0, Math.min(position, getMaxThumbPosition.call(this)));
        _(this).scrollPosition = _(this).thumbPosition / getMaxThumbPosition.call(this) * getMaxScrollPosition.call(this);
    }

    setScrollPosition (position) {
        _(this).scrollPosition = Math.max(0, Math.min(position, getMaxScrollPosition.call(this)));
        _(this).thumbPosition = _(this).scrollPosition / getMaxScrollPosition.call(this) * getMaxThumbPosition.call(this);
    }

    getThumbPosition () {
        return _(this).thumbPosition;
    }   

    getThumbSize () {
        return _(this).thumbSize;
    }

    getScrollPosition () {
        return _(this).scrollPosition;
    }

}