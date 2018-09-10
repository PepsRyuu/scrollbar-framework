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
            { file: 'dist/es/' + file, format: 'es'},
            { file: 'dist/cjs/' + file, format: 'cjs'}
        ]
    }
}

module.exports = [
    generate('DragGesture.js'),
    generate('ScrollbarAnimator.js'),
    generate('ScrollbarState.js')
]