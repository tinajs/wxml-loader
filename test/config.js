import { resolve, dirname } from 'path';
import Config from 'webpack-chain';

export default (options = {}, chainWebpack) => {
	const { target, globalPublicPath = '/', ...wxmlLoaderOptions } = options;
	const entry = resolve(__dirname, 'src', 'index.wxml');
	const context = dirname(entry);

	const config = new Config();

	config
		.entry('entry')
		.add(entry)
		.end()
		.mode('development')
		.output.filename('index.js')
		.publicPath(globalPublicPath)
		.path(resolve(__dirname, 'dist'))
		.end()
		.target(target)
		.module.rule('wxml')
		.test(/\.wxml$/)
		.use('file')
		.loader('file-loader')
		.options({
			name: '[name].[ext]',
			useRelativePath: true,
			context,
		})
		.end()
		.use('extract')
		.loader('extract-loader')
		.end()
		.use('wxml')
		.loader(require.resolve('../src'))
		.options({
			root: context,
			...wxmlLoaderOptions,
		})
		.end()
		.end()
		.rule('gif')
		.test(/\.gif$/)
		.use('file')
		.loader('file-loader')
		.options({
			name: '[name].[ext]',
			useRelativePath: true,
			context,
		})
		.end()
		.end()
		.end()
		.stats('verbose');

	if (chainWebpack) {
		chainWebpack(config);
	}

	return config.toConfig();
};
