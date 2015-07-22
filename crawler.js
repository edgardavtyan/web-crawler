var async = require('async');
var cheerio = require('cheerio');
var fs = require('fs');
var htmlFormat = require('js-beautify').html;
var promise = require('bluebird');
var htmlTidy = promise.promisify(require('htmltidy').tidy);
var path = require('path');
var request = promise.promisify(require('request'));
var url = require('url');

module.exports = function(website) {
	request(website.homepage)
	.spread(function(response, homepageHtml) {
		return homepageHtml;
	})
	.then(function(homepageHtml) {
		var homepage = cheerio.load(homepageHtml);
		var articleLinks = homepage(website.articleLinkSelector);
		return articleLinks.toArray();
	})
	.then(function(articleLinks) {
		async.forEachOf(articleLinks, function(articleLink, index) {
			var fullArticleLink =
				url.resolve(website.homepage, articleLink.attribs.href);

			request(fullArticleLink)
			.spread(function(response, articlePageHtml) {
				var articlePage = cheerio.load(articlePageHtml);
				var articleContent = articlePage(website.articleContentSelector);
				return articleContent;
			})
			.then(function(articleContent) {
				website.redunantNodesSelectors.forEach(function(redunantNodeSelector) {
					articleContent.find(redunantNodeSelector).remove();
				});

				return articleContent.html();
			})
			.then(htmlTidy)
			.then(function(articleHtml) {
				return htmlFormat(articleHtml, { indent_size: 2 });
			})
			.then(function(articleHtml) {
				fs.writeFileSync('result/' + index + '.html', articleHtml);
				console.log('Write ' + index + '.html');
			});
		});
	});
};