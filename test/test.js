import { resolve } from 'path';
import rimraf from 'rimraf';
import { readFileSync, writeFileSync } from 'fs';
import webpack from 'webpack';
import config from './config';

const getCompiledRes = (filePath = 'index.wxml') =>
	readFileSync(resolve(__dirname, 'dist', filePath), 'utf8');

const writeWXML = (content) =>
	writeFileSync(resolve(__dirname, 'src', 'index.wxml'), content, 'utf8');

const clear = () => {
	rimraf.sync(resolve(__dirname, 'src', 'index.wxml'));
	rimraf.sync(resolve(__dirname, 'dist'));
};

const target = (target) => (compiler) =>
	compiler.apply(new webpack.LoaderTargetPlugin(target));

const mkdir = () => {
	clear();
};

const compile = (content, options = {}, chainWebpack) => {
	writeWXML(content);
	return new Promise((resolve, reject) => {
		webpack(config(options, chainWebpack), (err, stats) => {
			if (err || stats.hasErrors()) {
				reject(err || JSON.stringify(stats.toJson('errors-only')));
			}
			else {
				resolve();
			}
		});
	});
};

describe('wxml-loader', async () => {
	beforeEach(mkdir);
	afterEach(clear);

	test('should export file', async () => {
		const content = '<view></view>';
		await compile(content);
		expect(getCompiledRes()).toBe(content);
	});

	test('should minimize file', async () => {
		await compile('<view> </view>', { minimize: true });
		expect(getCompiledRes()).toBe('<view></view>');
	});

	test('should minimize work with self closing element', async () => {
		await compile('<input />', { minimize: true });
		expect(getCompiledRes()).toBe('<input/>');
	});

	test('should src work', async () => {
		await compile('<image src="./images/image.gif" />');
		expect(getCompiledRes()).toBe('<image src="/images/image.gif" />');
	});

	test('should root optinal', async () => {
		const content = '<image src="./images/image.gif" />';
		await compile(content, { root: undefined });
		expect(getCompiledRes()).toBe('<image src="/images/image.gif" />');
	});

	test('should dynamic src not work', async () => {
		await compile('<image src="./images/{{image}}.gif" />');
		expect(getCompiledRes()).toBe('<image src="./images/{{image}}.gif" />');
	});

	test('should Wechat target work', async () => {
		await compile(
			'<import src="/fixture.wxml" /><view wx:for="{{items}}">{{item}}</view>',
			{ target: target(function Wechat() {}) },
		);
		expect(getCompiledRes()).toBe(
			'<import src="/fixture.wxml" /><view wx:for="{{items}}">{{item}}</view>',
		);
	});

	test('should Alipay target work', async () => {
		await compile(
			'<import src="/fixture.wxml" /><view wx:for="{{items}}">{{item}}</view>',
			{ target: target(function Alipay() {}) },
		);
		expect(getCompiledRes()).toBe(
			'<import src="/fixture.axml" /><view a:for="{{items}}">{{item}}</view>',
		);
	});

	test('should transformContent() work', async () => {
		await compile('<view wx:for="{{items}}"> {{item}} </view>', {
			target: target(function Alipay() {}),
			transformContent: (content) => content.replace(/\bwx:/, '🦄:'),
		});
		expect(getCompiledRes()).toBe('<view 🦄:for="{{items}}"> {{item}} </view>');
	});

	// DEPRECATED
	test('should format() work', async () => {
		await compile('<view wx:for="{{items}}"> {{item}} </view>', {
			target: target(function Alipay() {}),
			format: (content) => content.replace(/\bwx:/, '🦄:'),
		});
		expect(getCompiledRes()).toBe('<view 🦄:for="{{items}}"> {{item}} </view>');
	});

	test('should transformUrl() work', async () => {
		await compile('<import src="/fixture.wxml" />', {
			target: target(function Alipay() {}),
			transformUrl: (url) => url.replace(/fixture/, '🦄'),
		});
		expect(getCompiledRes()).toBe('<import src="/🦄.wxml" />');
	});

	test('should minimize work with <inline><block/></inline>', async () => {
		const code = '<span><div></div></span>';
		await compile(code, { minimize: true });
		expect(getCompiledRes()).toBe('<span><div></div></span>');
	});

	test('should minimize work with camelCase attribute', async () => {
		const code = '<div nickName="name"></div>';
		await compile(code, { minimize: true });
		expect(getCompiledRes()).toBe('<div nickName="name"></div>');
	});

	test('should minimize work with form attribute', async () => {
		const code = '<form bindsubmit="submitForm" report-submit="true">';
		await compile(code, { minimize: true });
		expect(getCompiledRes()).toBe(
			'<form bindsubmit="submitForm" report-submit="true"></form>',
		);
	});

	test('should minimize work with controls attribute', async () => {
		const code = '<map id="map" controls="{{controls}}"></map>';
		await compile(code, { minimize: true });
		expect(getCompiledRes()).toBe(
			'<map id="map" controls="{{controls}}"></map>',
		);
	});

	test('should ensure url if not absolute and not starts with a dot', async () => {
		const code = '<image src="./fixture.gif" />';
		await compile(code, { globalPublicPath: '' });
		expect(getCompiledRes()).toBe('<image src="./fixture.gif" />');
	});

	test('should enforceRelativePath work', async () => {
		const code = '<image src="./images/image.gif" />';
		await compile(code, { enforceRelativePath: true });
		expect(getCompiledRes()).toBe('<image src="./images/image.gif" />');
	});

	test('should work if publicPath starts with protocol', async () => {
		const code = '<image src="./fixture.gif" />';
		await compile(code, { globalPublicPath: 'http://m.baidu.com/' });
		expect(getCompiledRes()).toBe(
			'<image src="http://m.baidu.com/fixture.gif" />',
		);
	});

	test('should generate safe path', async () => {
		const context = resolve(__dirname, 'src/sub');
		const outside = resolve(__dirname, 'src');
		await compile('<image src="./fixture.gif" />', {}, (config) => {
			config.context(context);
			config.entryPoints.delete('entry');
			config
				.entry('_/index.js')
				.add('../index.wxml')
				.end();
			config.output.filename('[name]');
			config.module
				.rule('wxml')
				.uses.clear()
				.end()
				.use('file')
				.loader('file-loader')
				.options({
					name: '_/index.wxml',
				})
				.end()
				.use('extract')
				.loader('extract-loader')
				.end()
				.use('wxml')
				.loader(require.resolve('../src'))
				.options({
					root: context,
					enforceRelativePath: true,
				})
				.end();
			config.module.rule('gif').include.add(outside);
		});
		expect(getCompiledRes('_/index.wxml')).toBe(
			'<image src="../fixture.gif" />',
		);
	});

	test('should export javascript by default', async () => {
		await compile('<view></view>', {}, (config) => {
			config.module
				.rule('wxml')
				.uses.clear()
				.end()
				.use('file')
				.loader('file-loader')
				.options({
					name: '[name].[ext]',
				})
				.end()
				.use('wxml')
				.loader(require.resolve('../src'))
				.end();
		});
		expect(getCompiledRes('index.wxml')).toBe(
			'module.exports = "<view></view>"',
		);
	});

	test('should raw optional', async () => {
		await compile('<view></view>', {}, (config) => {
			config.module
				.rule('wxml')
				.uses.clear()
				.end()
				.use('file')
				.loader('file-loader')
				.options({
					name: '[name].[ext]',
				})
				.end()
				.use('wxml')
				.loader(require.resolve('../src'))
				.options({
					raw: true,
				})
				.end();
		});
		expect(getCompiledRes()).toBe('<view></view>');
	});
});
