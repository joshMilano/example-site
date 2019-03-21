'use strict';
var cheerio = require('cheerio');
var jsTemplate = require('js-template');
var templateRegex = new RegExp(/[<>]/);
var SimpleCache = require('./lib/cache');

var piTemplate = function (fileOrHtml, data, options, nested) {

  var html;
  options = options || {};
  options.layoutPath = __filename;

  if (!options.locale) {
    options.locale = require('./locales/en_US');
  }
  // try to reuse cached output
  var output = options.cache ? piTemplate.cache.get(options.cache) : false;
  // namespace for all used functions within template
  data.$helpers = {};
  // run through all supported directives and init them
  piTemplate.directives.forEach(function (run) {
    run.init && run.init(data, options, piTemplate);
  });

  // bind current options to all supported pipes
  data.$pipes = {};
  Object.keys(piTemplate.pipes).forEach(function (pipe) {
    data.$pipes[pipe] = piTemplate.pipes[pipe].bind(piTemplate, options);
  });

  if (!output) {
    // we've got a template
    if (templateRegex.test(fileOrHtml)) {
      html = fileOrHtml;
    } else {
      // we've got a file path
      options.layoutPath = fileOrHtml;
      // read template from disk
      html = piTemplate.helpers.read(options.layoutPath, options);
    }

    // invoke custom function if need that manipulates html
    if (typeof options.preprocess === 'function') {
      html = options.preprocess(html);
    }

    if (!options.prefix) {
      options.prefix = 'ht';
    }
    if (!options.cheerioOptions) {
      options.cheerioOptions = { _useHtmlParser2: true };
    }
    var $ = cheerio.load(html, options.cheerioOptions);

    // run through all supported directives
    piTemplate.directives.forEach(function (run) {
      run($, data, options, piTemplate);
    });

    /**
     * curly-braces exprepression
     */
    output = $.html()
      .replace(/&lt;%/g, "<%")                       // <%
      .replace(/%&gt;/g, "%>")                        // %>
      .replace(/; i &lt;/g, "; i <")                  // ; i <
      .replace(/&quot;/g, '"')                       // "
      .replace(/&apos;/g, "'")                       // '
      .replace(/ &amp;&amp; /g, " && ")              // &&
      .replace(/{{(.*?)}}/g, function (match, capture) {
        return "<%=" + piTemplate.helpers.expression(capture, options) + "%>";
      }) // {{ .. | pipe | pipe2}}

    if (options.cache) {
      piTemplate.cache.put(options.cache, output);
    }
  }

  if (options.jsMode) {
    return output;
  } else {
    try {
      return jsTemplate(output, data);
    } catch (e) {
      if (e.raisedOnceException) {
        throw e.raisedOnceException;
      } else {
        var lines = output.split("\n");
        for (var i = e.lineNo - 3; i < e.lineNo + 3; i++) {
          console.log(i + 1, lines[i]);
        }
        console.log("processing template:", options.layoutPath);
        console.log("error in line", e.lineNo);
        e.raisedOnceException = e;
        throw e;
      }
    }
  }
};

// exposed prop that is used to store cached templates to avoid IO (right before calling jsTemplate)
piTemplate.cache = new SimpleCache('$$');

// list of supported and enabled directives (can be changed at runtime)
piTemplate.directives = [
  require('./directives/include'),
  require('./directives/repeat'),
  require('./directives/if'),
  require('./directives/class'),
  require('./directives/bind'),
  require('./directives/style')
];

// key/value pairs of supported pipes
piTemplate.pipes = {
  lowercase: require('./pipes/lowercase'),
  uppercase: require('./pipes/uppercase'),
  number: require('./pipes/number'),
  currency: require('./pipes/currency'),
  json: require('./pipes/json'),
  date: require('./pipes/date'),
  limitTo: require('./pipes/limit-to'),
  filter: require('./pipes/filter')
};

// all internal helpers will be exposed as well and can be overriden
piTemplate.helpers = require('./lib/helpers');

// export {angularTemplate as angularTemplate}  
module.exports = piTemplate;