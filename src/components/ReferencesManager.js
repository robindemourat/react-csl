import React, {Component} from 'react';
import PropTypes from 'prop-types';

const CSL = require('citeproc');
const HtmlToReactParser = require('html-to-react').Parser;
const htmlToReactParser = new HtmlToReactParser();

class ReferencesManager extends Component {

  constructor(props) {
    super(props);
    this.state = {
      bibliography: '',
      sys: {
        retrieveLocale: () => {
          return this.props.locale;
        },
        retrieveItem: (id) => {
          return this.props.items[id];
        }
      }
    };

    this.makeReactBibliography = (processor, items) => {
      processor.updateItems(Object.keys(items));
      const bibResults = processor.makeBibliography();

      const biblioStr = bibResults[1].join('\n');
      return htmlToReactParser.parse(biblioStr);
    };

    this.makeReactCitations = (processor, cits) => {
      return cits.reduce((inputCitations, citationData) => {
        const citations = {...inputCitations};
        const citation = citationData[0];
        const citationsPre = citationData[1];
        const citationsPost = citationData[2];
        let citationObjects = processor.processCitationCluster(citation, citationsPre, citationsPost);
        citationObjects = citationObjects[1];
        citationObjects.forEach(cit => {
          const order = cit[0];
          const html = cit[1];
          const ThatComponent = htmlToReactParser.parse(cit[1]);
          const citationId = cit[2];
          citations[citationId] = {
            order,
            html,
            Component: ThatComponent
          };
        });
        return citations;
      }, {});
    };
  }

  getChildContext() {
    return {
      bibliography: this.state.bibliography,
      citations: this.state.citations
    };
  }

  componentDidMount() {
    if (this.props.locale && this.props.style) {
      const processor = new CSL.Engine(this.state.sys, this.props.style);
      this.setState({
        processor,
        citations: this.props.citations && this.makeReactCitations(processor, this.props.citations),
        bibliography: this.props.items && this.makeReactBibliography(processor, this.props.items),
      });
    }
  }

  componentWillReceiveProps(nextProps) {
    if (!this.state.processor && this.props.locale && this.props.style) {
      const processor = new CSL.Engine(this.state.sys, nextProps.style);
      this.setState({
        processor
      });
    }
  }

  componentDidUpdate(prevProps) {
    if (this.state.processor &&
      (this.props.items !== prevProps.items) ||
      (this.props.citations !== prevProps.citations) ||
      !this.state.bibliography) {
      this.setState({
        citations: this.props.citations && this.makeReactCitations(this.state.processor, this.props.citations),
        bibliography: this.makeReactBibliography(this.state.processor, this.props.items),
      });
    }
    // handle locale change
    if (this.props.locale !== prevProps.locale) {
      const sys = {
        retrieveLocale: () => {
          return this.props.locale;
        },
        retrieveItem: (id) => {
          return this.props.items[id];
        }
      };
      const processor = new CSL.Engine(sys, this.props.style);
      this.setState({
        processor,
        citations: this.props.citations && this.makeReactCitations(processor, this.props.citations),
        bibliography: this.makeReactBibliography(processor, this.props.items),
        sys
      });
    }
    // handle style change
    if (this.props.style !== prevProps.style) {
      const processor = new CSL.Engine(this.state.sys, this.props.style);
      this.setState({
        processor,
        citations: this.props.citations && this.makeReactCitations(processor, this.props.citations),
        bibliography: this.makeReactBibliography(processor, this.props.items),
      });
    }
  }
  render () {
    const {
      componentClass,
      children
    } = this.props;

    return (<section className={componentClass}>{children}</section>);

  }
}

ReferencesManager.propTypes = {
  /**
   * The class to use for identifying the component
   */
  componentClass: PropTypes.string,
  /**
   * Serialized csl data to use for styling the bibliography
   */
  style: PropTypes.string,
  /**
   * Serialized csl data to use for localizing the terms
   */
  locale: PropTypes.string,
  /**
   * csl-json bibliographic items to represent - keys stand for items ids, values are js objects
   */
  items: PropTypes.object,
  /**
   * array of citation arrays to use for building citations data
   * Each citation array represents the citation content and context as follows :
   * citation[0] : object containing the citations (with properties citationID (string), citationItems (array), and properties (object))
   * citation[1] : array of citations preceding the given citation ([0]: citationId, [1]: citation index)
   * citation[2] : array of citations following the given citation ([0]: citationId, [1]: citation index)
   */
  citations: PropTypes.array,
};

ReferencesManager.childContextTypes = {
  bibliography: PropTypes.array,
  citations: PropTypes.object
};

export default ReferencesManager;
