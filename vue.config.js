module.exports = {
    configureWebpack: {},
    devServer: {
        public: '0.0.0.0:8080',
        hot: true,
        disableHostCheck: true
    },
    publicPath: process.env.NODE_ENV === 'production' ? '/dist/' : '/'
}