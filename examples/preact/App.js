class App extends React.Component {
    constructor () {
        super();
        this.data = [...Array(1e3).keys()].map(i => `Item ${i}`)
    }

    render () {
        return (
            <div class="list">
                <VirtualList data={this.data} />
            </div>
        )
    }
}

React.render(<App />, document.querySelector('#root'));