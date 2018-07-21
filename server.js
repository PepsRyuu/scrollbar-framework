let express = require('express');
let app = express();
let pkg = require('./package.json');

app.use('/', express.static(__dirname));
app.use(`/examples/:framework/node_modules/${pkg.name}`, express.static(__dirname));

app.listen(8585, () => {
    console.log('Listening on 8585...');
});