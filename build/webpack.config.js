const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const resolve = dir => path.join(__dirname, '..', dir);

module.exports = {
  entry: {
    xspreadsheet: './src/index.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          }
        },
        include: [resolve('src'), resolve('test')],
      },
      // {
      //   test: /\.css$/,
      //   use: [
      //     MiniCssExtractPlugin.loader,
      //     'style-loader',
      //     'css-loader',
      //   ],
      // },
      {
        test: /\.scss$/,
        use: [
          MiniCssExtractPlugin.loader,
          //'css-loader',
          {
            loader: "css-loader",
            options: {sourceMap: true},
          },
          {
            loader: "sass-loader",
            options: {
              sourceMap: true,
              // lessOptions: {
              //   sourceMap: { outputSourceFiles: true },
              // },
            },
          },
        ],
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: [
          'file-loader',
        ],
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: [
          'file-loader',
        ],
      },
    ],
  },
};
