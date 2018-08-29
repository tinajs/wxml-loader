import { resolve, dirname } from 'path';
import merge from 'webpack-merge';

export default (options = {}, webpackConfig = {}) => {
	const { target, globalPublicPath = '/', ...wxmlLoaderOptions } = options;
	const entry = resolve(__dirname, 'src', 'index.wxml');
	const context = dirname(entry);

	return merge.smart({
		entry,
		mode: 'development',
		output: {
			filename: 'index.js',
			publicPath: globalPublicPath,
			path: resolve(__dirname, 'dist'),
		},
		target,
		module: {
			rules: [
				{
					test: /\.wxml$/,
					use: [
						{
							loader: 'file-loader',
							options: {
								name: '[name].[ext]',
								useRelativePath: true,
								context,
							},
						},
						{
							loader: require.resolve('../src'),
							options: {
								root: context,
								...wxmlLoaderOptions,
							},
						},
					],
				},
				{
					test: /\.gif$/,
					use: [
						{
							loader: 'file-loader',
							options: {
								name: '[name].[ext]',
								useRelativePath: true,
								context,
							},
						},
					],
				},
			],
		},
		stats: 'verbose',
	}, webpackConfig);
};
