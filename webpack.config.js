module.exports = {
    entry: "./src/client/js/appSrc.js",
    output: {
        path: __dirname,
        filename: './src/client/js/app.js',
        library: "app",
    }
};
