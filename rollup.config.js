let buble = require('rollup-plugin-buble');

let generate = file => {
    return {
        input: 'src/' + file,
        plugins: [
            buble({
                objectAssign: 'Object.assign'
            })
        ],
        output: [
            { file: 'dist/' + file, format: 'es'}
        ]
    }
}

module.exports = [
    generate('DragGesture.js'),
    generate('ScrollbarAnimator.js'),
    generate('ScrollbarState.js')
]