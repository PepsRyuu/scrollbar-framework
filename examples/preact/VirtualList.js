const STYLE_INNER = 'position:relative; overflow:hidden; width:100%; min-height:100%;';
const STYLE_CONTENT = 'position:absolute; top:0; left:0; height:100%; width:100%; overflow:visible;';
const ROW_HEIGHT = 30;
const OVERSCAN_COUNT = 10;

// Based on https://github.com/developit/preact-virtual-list
// License MIT
// See original for complete working version.
window.VirtualList = class VirtualList extends React.Component {
    constructor () {
        super ();

        this.state = {
            height: 0,
            scrollTop: 0
        }

        this.resize = this.resize.bind(this);
        this.onScroll = this.onScroll.bind(this);
    }

    componentDidMount () {
        this.resize();
        window.addEventListener('resize', this.resize);
    }

    componentWillUnmount () {
        window.removeEventListener('resize', this.resize);
    }

    resize () {
        this.setState({ height: this.base.offsetHeight });
        this.forceUpdate();
    }

    onScroll (scrollTop) {
        this.setState({ scrollTop });
        this.forceUpdate();
    }

    render() {
        let { height, scrollTop } = this.state;
        let { data } = this.props;
        let start = Math.floor(scrollTop / ROW_HEIGHT);
        start = Math.max(0, start - (start % OVERSCAN_COUNT));
        let visible = Math.ceil(height / ROW_HEIGHT) + OVERSCAN_COUNT;
        let end = start + visible;
        let selection = data.slice(start, end);

        return (
            <Scrollbar onScroll={this.onScroll}>
                <div style={`${STYLE_INNER} height:${data.length * ROW_HEIGHT}px;`}>
                    <div style={`${STYLE_CONTENT} top:${start * ROW_HEIGHT}px;`}>
                        {
                            selection.map(value => (
                                <div class="row">{value}</div>
                            ))
                        } 
                    </div>
                </div>
            </Scrollbar>
        );
    }
}
