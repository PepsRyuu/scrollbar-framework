const BUTTON_SIZE = 17; 
const TRACK_SCROLL_RATE = 349;
const ARROW_SCROLL_RATE = 40;

window.Scrollbar = class Scrollbar extends React.Component {
    constructor () {
        super();

        // Set up the state and animator for the scrollbar
        // The scrollbar state will be referenced a lot in this file.
        this.scrollbar = new ScrollbarState();
        this.animator = new ScrollbarAnimator({
            onPositionRequest: () => {
                return this.scrollbar.getScrollPosition();
            },

            onMaximumRequest: () => {
                return this.content.scrollHeight;
            },

            onAnimationFrame: pos => {
                this.scrollbar.setScrollPosition(pos);
                this.renderScrollbar();
                this.props.onScroll(this.scrollbar.getScrollPosition());
            }
        });

        this.onThumbDown = this.onThumbDown.bind(this);
        this.onArrowDown = this.onArrowDown.bind(this);
        this.onTrackDown = this.onTrackDown.bind(this);
        this.onWheel = this.onWheel.bind(this);
        this.onResize = this.onResize.bind(this);
    }

    componentDidMount () {
        this.onResize();
        window.addEventListener('resize', this.onResize);
    }

    componentDidUpdate () {
        this.onResize();
    }

    componentWillUnmount () {
        window.removeEventListener('resize', this.onResize);
    }

    onResize () {
        this.scrollbar.setButtonSize(BUTTON_SIZE / window.devicePixelRatio);
        this.scrollbar.setViewportSize(Math.round(this.base.getBoundingClientRect().height) - 2); // border style
        this.scrollbar.setScrollSize(this.content.scrollHeight);
        this.renderScrollbar();
    }

    onThumbDown (e) {
        e.stopPropagation(); // don't propagate to onTrackDown.
        let start = this.scrollbar.getThumbPosition();

        DragGesture(e, delta => {
            this.scrollbar.setThumbPosition(start + delta.y);
            this.renderScrollbar();
            this.props.onScroll(this.scrollbar.getScrollPosition());
        });
    }

    onTrackDown (e) {
        let direction = (e.pageY - this.base.getBoundingClientRect().top - BUTTON_SIZE) < this.scrollbar.getThumbPosition()? -1 : 1;
        this.delayedScroll(TRACK_SCROLL_RATE * direction, e);
    }

    onArrowDown (e, direction) {
        this.delayedScroll(ARROW_SCROLL_RATE * direction, e);
    }

    onWheel (e) {
        this.animator.scroll(e.deltaY);
    }

    delayedScroll (delta, event) {
        let timeout, interval, removeInterval, updateMousePosition;
        let currentTarget = event.currentTarget;
        
        let mousePosition = {
            x: event.pageX,
            y: event.pageY
        }

        this.animator.scroll(delta);

        // When you hold the mouse down, we wait 300 ms
        // and then start automatically scrolling until you let go.
        timeout = setTimeout(() => {
            this.animator.scroll(delta * 2);
            interval = setInterval(() => {
                if (document.elementFromPoint(mousePosition.x, mousePosition.y) !== currentTarget) {
                    clearInterval(interval);
                    return;
                }

                this.animator.scroll(delta * 2);
            }, 100) 
        }, 300)

        removeInterval = () => {
            clearTimeout(timeout);
            clearInterval(interval);
            document.removeEventListener('mousemove', updateMousePosition);
            document.removeEventListener('mouseup', removeInterval);
        }

        updateMousePosition = (e) => {
            e.preventDefault();

            mousePosition = {
                x: event.pageX,
                y: event.pageY
            };
        }

        document.addEventListener('mousemove', updateMousePosition);
        document.addEventListener('mouseup', removeInterval);
    }

    renderScrollbar () {
        // Scaling the graphics of the scrollbar for the zoom level.
        let scaled_button_size = BUTTON_SIZE / window.devicePixelRatio;

        this.scrollbarEl.style.width = `${scaled_button_size}px`;
        this.arrowUp.style.height = `${scaled_button_size}px`;
        this.arrowDown.style.height = `${scaled_button_size}px`;
        this.track.style.height = `calc(100% - ${scaled_button_size * 2}px)`

        this.thumb.style.transform = `translateY(${this.scrollbar.getThumbPosition()}px)`;
        this.thumb.style.height = this.scrollbar.getThumbSize() + 'px';
        let scrollTop = this.scrollbar.getScrollPosition();
        this.content.scrollTop = scrollTop;

        if (this.content.scrollTop === 0) {
            this.arrowUp.classList.remove('active');
        } else {
            this.arrowUp.classList.add('active');
        }

        // Fixes weird rounding issues on different zoom levels
        if (Math.abs(Math.round(this.content.scrollHeight) - Math.round(this.content.scrollTop) - Math.round(this.content.getBoundingClientRect().height)) <= 1) {
            this.arrowDown.classList.remove('active');
        } else {
            this.arrowDown.classList.add('active');
        }
    }

    render () {
        return (
            <div class="Scrollable">
                <div class="Scrollable-content" ref={e => this.content = e} onWheel={this.onWheel}>
                    {this.props.children}
                </div>
                <div class="Scrollable-scrollbar" ref={e => this.scrollbarEl = e}>
                    <div class="Scrollable-arrow up" ref={e => this.arrowUp = e} onMouseDown={e => this.onArrowDown(e, -1)} />
                    <div class="Scrollable-track" ref={e => this.track = e} onMouseDown={this.onTrackDown}>
                        <div class="Scrollable-thumb" ref={e => this.thumb = e} onMouseDown={this.onThumbDown} />
                    </div>
                    <div class="Scrollable-arrow down" ref={e => this.arrowDown = e} onMouseDown={e => this.onArrowDown(e, 1)} />
                </div>
            </div>
        );
    }
}