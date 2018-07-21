function normalize (e) {
    e.preventDefault();
    e = e.touches? e.touches[0] : e;
    return { x: e.pageX, y: e.pageY };
}

export default function DragGesture (e, onMove, onEnd) {
    let start = normalize(e);

    let onMouseMove = e => {
        let curr = normalize(e);

        if (onMove) {
            onMove({
                x: curr.x - start.x,
                y: curr.y - start.y
            }, e);
        }
    };

    let onMouseUp = e => {
        for (let key in events) {
            document.removeEventListener(key, events[key]);
        }

        let curr = normalize(e);

        if (onEnd) {
            onEnd({
                x: curr.x - start.x,
                y: curr.y - start.y
            }, e);
        }
    };

    let events = {
        'mouseup': onMouseUp,
        'mouseleave': onMouseUp,
        'mousemove': onMouseMove,
        'mousedown': e => e.preventDefault(),
        'touchmove': onMouseMove,
        'touchend': onMouseUp
    };

    for (let key in events) {
        document.addEventListener(key, events[key]);
    }
}