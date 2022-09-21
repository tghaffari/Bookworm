import React from 'react';
import parseRoute from '../lib/parse-route';
import BookEntryDetailsModal from '../components/book-entry-details';
import RenderSearchResult from '../components/render-search-results';

export default class SearchResults extends React.Component {
  constructor(props) {
    super(props);
    const startValue = this.formatSearchResults();
    this.state = {
      searchValue: startValue,
      isLoading: true,
      results: [],
      showModal: false,
      selectedBook: null
    };
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.fetchSearchResults = this.fetchSearchResults.bind(this);
    this.handleAddToLibrary = this.handleAddToLibrary.bind(this);
    this.closeBookDetailsModal = this.closeBookDetailsModal.bind(this);
  }

  handleInputChange(event) {
    this.setState({ searchValue: event.target.value });
  }

  formatSearchResults() {
    const paramString = this.props.params.toString();
    const query = decodeURIComponent(paramString.slice(2)).replaceAll('+', ' ');
    return query;
  }

  handleSubmit(event) {
    event.preventDefault();
    const query = this.state.searchValue.replaceAll(' ', '+');
    window.location.hash = (`search?q=${query}`);
    return null;
  }

  fetchSearchResults() {
    fetch(`https://www.googleapis.com/books/v1/volumes?q=${this.props.params.toString()}&maxResults=20&key=${process.env.API_KEY}`)
      .then(res => res.json())
      .then(data => {
        if (data.totalItems === 0) {
          this.setState({
            isLoading: false,
            results: 'Sorry, no results were found. Please try again...'
          });
        } else {
          this.setState({
            isLoading: false,
            results: data.items
          });
        }
      })
      .catch(err => console.error(err));
  }

  saveBook(bookDetails) {
    const init = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bookDetails)
    };

    fetch('/api/saveBooks', init)
      .catch(err => console.error(err));
  }

  handleAddToLibrary(event) {
    const closestLi = event.target.closest('li');
    const id = closestLi.getAttribute('data-id');
    const book = this.state.results.find(result => result.id === id);

    let author = '';
    if (book.volumeInfo.authors !== undefined) {
      author = book.volumeInfo.authors.join(', ');
    }
    let publishedYear = '';
    if (book.volumeInfo.publishedDate !== undefined) {
      publishedYear = book.volumeInfo.publishedDate.slice(0, 4);
    }

    let src = 'https://fivebooks.com/app/uploads/2010/09/no_book_cover.jpg';
    if (book.volumeInfo.imageLinks !== undefined) {
      src = book.volumeInfo.imageLinks.thumbnail;
    }

    const bookDetails = {
      googleId: book.id,
      title: book.volumeInfo.title,
      author,
      description: book.volumeInfo.description,
      publishedYear,
      isbn: book.volumeInfo.industryIdentifiers[1].identifier,
      coverImgURL: src
    };

    if (event.target.value === 'to-read') {
      this.saveBook(bookDetails);

    } else if (event.target.value === 'read') {
      this.setState({
        showModal: true,
        selectedBook: bookDetails
      });
    }
  }

  closeBookDetailsModal() {
    this.setState({ showModal: false });
  }

  componentDidMount() {
    this.fetchSearchResults();
  }

  componentDidUpdate(prevProps) {
    const currentURL = new URL(window.location);
    const parsedURL = parseRoute(currentURL.hash);
    const currentParams = parsedURL.params.toString();
    const prevParams = prevProps.params.toString();

    if (prevParams !== currentParams) {
      this.fetchSearchResults();
    }
  }

  render() {
    if (this.state.isLoading) return null;

    const searchResults = this.state.results.map((results, index) => {
      return <RenderSearchResult results={results} addToLibrary = {this.handleAddToLibrary} key={results.id}/>;
    });

    return (
      <>
        <h1 className='search-heading'>Search</h1>
        <form onSubmit={this.handleSubmit}>
          <input
          className='search-bar'
          type='search'
          placeholder='Search books...'
          value={this.state.searchValue}
          onChange={this.handleInputChange}>
          </input>
        </form>
        <ul className='search-results-ul'>
          {searchResults}
        </ul>
        {this.state.showModal && <BookEntryDetailsModal book = {this.state.selectedBook} closeModal={this.closeBookDetailsModal} saveBook = {this.saveBook}/>}
      </>
    );
  }
}
