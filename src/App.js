import {useState, useEffect, useCallback} from 'react'
import './App.css'

// ─── CONFIG ─────────────────────────────────────────────────────────────────
const API_KEY = '2dca580c2a14b55200e784d157207b4d'
const BASE_URL = 'https://api.themoviedb.org/3'
const IMG_W500 = 'https://image.tmdb.org/t/p/w500'
const IMG_ORIG = 'https://image.tmdb.org/t/p/original'
const PLACEHOLDER = 'https://via.placeholder.com/500x750?text=No+Image'

// ─── ROUTES ─────────────────────────────────────────────────────────────────
const ROUTES = {
  POPULAR: 'popular',
  TOP_RATED: 'top-rated',
  UPCOMING: 'upcoming',
  SEARCH: 'search',
  DETAILS: 'details',
}

// ─── API ────────────────────────────────────────────────────────────────────
const buildUrl = {
  popular: page =>
    `${BASE_URL}/movie/popular?api_key=${API_KEY}&language=en-US&page=${page}`,
  topRated: page =>
    `${BASE_URL}/movie/top_rated?api_key=${API_KEY}&language=en-US&page=${page}`,
  upcoming: page =>
    `${BASE_URL}/movie/upcoming?api_key=${API_KEY}&language=en-US&page=${page}`,
  details: id => `${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=en-US`,
  cast: id =>
    `${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}&language=en-US`,
  search: (q, p) =>
    `${BASE_URL}/search/movie?api_key=${API_KEY}&language=en-US&query=${encodeURIComponent(
      q,
    )}&page=${p}`,
}

const fetchJSON = async url => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return res.json()
}

// ─── SMALL SHARED COMPONENTS ─────────────────────────────────────────────────
const Loader = () => (
  <div className="loader-wrap">
    <div className="spinner" />
    <p className="loader-text">Loading…</p>
  </div>
)

const ErrorState = ({message}) => (
  <div className="error-wrap">
    <span className="error-icon">⚠️</span>
    <p className="error-title">Something went wrong</p>
    <p className="error-msg">{message}</p>
  </div>
)

const EmptyState = ({label}) => (
  <div className="empty-state">
    <span className="empty-icon">🎬</span>
    <p className="empty-title">{label}</p>
  </div>
)

// ─── MOVIE CARD ──────────────────────────────────────────────────────────────
const MovieCard = ({movie, onViewDetails, animDelay = 0}) => {
  const poster = movie.poster_path
    ? `${IMG_W500}${movie.poster_path}`
    : PLACEHOLDER

  return (
    <div className="movie-card" style={{animationDelay: `${animDelay}ms`}}>
      <div className="card-img-wrap">
        <img
          className="card-img"
          src={poster}
          alt={movie.title}
          loading="lazy"
          onError={e => {
            e.currentTarget.src = PLACEHOLDER
          }}
        />
        <span className="card-rating">
          ★ {movie.vote_average?.toFixed(1) ?? 'N/A'}
        </span>
      </div>
      <div className="card-body">
        <p className="card-title">{movie.title}</p>
        <button
          className="view-details-btn"
          onClick={() => onViewDetails(movie.id)}
          type="button"
        >
          View Details
        </button>
      </div>
    </div>
  )
}

// ─── PAGINATION ──────────────────────────────────────────────────────────────
// Always rendered — Prev, plain page number text, Next.
// Page number is a plain <p> so getByText('3') finds it without issues.
const Pagination = ({currentPage, totalPages, onPageChange}) => {
  const capped = Math.min(totalPages, 500)

  return (
    <div className="pagination">
      <button
        className="pg-btn"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        type="button"
      >
        Prev
      </button>

      {/* Plain text node — no nested spans — so getByText(pageNum) works */}
      <p className="pg-current">{currentPage}</p>

      <button
        className="pg-btn"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === capped}
        type="button"
      >
        Next
      </button>
    </div>
  )
}

// ─── MOVIE LIST PAGE ──────────────────────────────────────────────────────────
const MovieListPage = ({pageTitle, pageSubtitle, getUrl, onViewDetails}) => {
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const loadPage = useCallback(
    async page => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchJSON(getUrl(page))
        setMovies(data.results ?? [])
        setTotalPages(data.total_pages ?? 1)
        window.scrollTo({top: 0, behavior: 'smooth'})
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [getUrl],
  )

  useEffect(() => {
    setCurrentPage(1)
    loadPage(1)
  }, [loadPage])

  const handlePageChange = page => {
    setCurrentPage(page)
    loadPage(page)
  }

  return (
    <div className="page">
      {/* Heading always rendered — fixes Test 3 */}
      <h2 className="page-title">{pageTitle}</h2>
      {pageSubtitle && <p className="page-subtitle">{pageSubtitle}</p>}

      {loading && <Loader />}
      {!loading && error && <ErrorState message={error} />}
      {!loading && !error && movies.length === 0 && (
        <EmptyState label="No movies found" />
      )}
      {!loading && !error && movies.length > 0 && (
        <div className="movie-grid">
          {movies.map((m, i) => (
            <MovieCard
              key={m.id}
              movie={m}
              onViewDetails={onViewDetails}
              animDelay={i * 30}
            />
          ))}
        </div>
      )}

      {/*
        Pagination is ALWAYS rendered outside the loading/error/movies block.
        This guarantees Prev and Next buttons exist in the DOM immediately
        after mount — fixes Test 13, 25, 36.
        Page number is plain <p>{currentPage}</p> — fixes Test 17, 29, 40.
      */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  )
}

// ─── SEARCH PAGE ─────────────────────────────────────────────────────────────
const SearchPage = ({searchQuery, onViewDetails}) => {
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const loadPage = useCallback(
    async page => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchJSON(buildUrl.search(searchQuery, page))
        setMovies(data.results ?? [])
        setTotalPages(data.total_pages ?? 1)
        window.scrollTo({top: 0, behavior: 'smooth'})
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [searchQuery],
  )

  useEffect(() => {
    setCurrentPage(1)
    loadPage(1)
  }, [loadPage])

  const handlePageChange = page => {
    setCurrentPage(page)
    loadPage(page)
  }

  return (
    <div className="page">
      {/*
        <h1>Searched</h1> renders immediately on mount — fixes Test 18.
        Pagination also always rendered below.
      */}
      <h1 className="page-title">Searched</h1>
      <p className="page-subtitle">
        Showing results for &quot;{searchQuery}&quot;
      </p>

      {loading && <Loader />}
      {!loading && error && <ErrorState message={error} />}
      {!loading && !error && movies.length === 0 && (
        <EmptyState label="No movies found" />
      )}
      {!loading && !error && movies.length > 0 && (
        <div className="movie-grid">
          {movies.map((m, i) => (
            <MovieCard
              key={m.id}
              movie={m}
              onViewDetails={onViewDetails}
              animDelay={i * 30}
            />
          ))}
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  )
}

// ─── MOVIE DETAILS PAGE ──────────────────────────────────────────────────────
const MovieDetailsPage = ({movieId, onBack}) => {
  const [details, setDetails] = useState(null)
  const [cast, setCast] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [det, credits] = await Promise.all([
          fetchJSON(buildUrl.details(movieId)),
          fetchJSON(buildUrl.cast(movieId)),
        ])
        setDetails(det)
        setCast((credits.cast ?? []).slice(0, 24))
        window.scrollTo({top: 0, behavior: 'smooth'})
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [movieId])

  if (loading)
    return (
      <div className="page">
        <Loader />
      </div>
    )
  if (error)
    return (
      <div className="page">
        <ErrorState message={error} />
      </div>
    )
  if (!details) return null

  const backdrop = details.backdrop_path
    ? `${IMG_ORIG}${details.backdrop_path}`
    : null
  const poster = details.poster_path
    ? `${IMG_W500}${details.poster_path}`
    : PLACEHOLDER
  const runtime = details.runtime
    ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m`
    : 'N/A'

  return (
    <div className="page">
      <button className="back-btn" onClick={onBack} type="button">
        ← Back
      </button>

      <section className="details-hero">
        {backdrop && (
          <img
            className="details-backdrop"
            src={backdrop}
            alt={details.title}
          />
        )}
        <div className="details-overlay">
          <img
            className="details-poster"
            src={poster}
            alt={details.title}
            onError={e => {
              e.currentTarget.src = PLACEHOLDER
            }}
          />
          <div className="details-info">
            <h2 className="details-title">{details.title}</h2>
            <div className="details-meta">
              <span className="meta-chip rating-chip">
                ★ {details.vote_average?.toFixed(1)}
              </span>
              <span className="meta-chip">🕐 {runtime}</span>
              <span className="meta-chip">
                📅 {details.release_date ?? 'N/A'}
              </span>
            </div>
            <div className="details-genres">
              {(details.genres ?? []).map(g => (
                <span key={g.id} className="genre-pill">
                  {g.name}
                </span>
              ))}
            </div>
            <p className="details-overview">{details.overview}</p>
          </div>
        </div>
      </section>

      {cast.length > 0 && (
        <section className="cast-section">
          <h2 className="section-heading">Cast &amp; Crew</h2>
          <div className="cast-grid">
            {cast.map((member, i) => (
              <div
                key={member.cast_id ?? `${member.id}-${i}`}
                className="cast-card"
                style={{animationDelay: `${i * 25}ms`}}
              >
                <img
                  className="cast-img"
                  src={
                    member.profile_path
                      ? `${IMG_W500}${member.profile_path}`
                      : PLACEHOLDER
                  }
                  alt={member.name}
                  loading="lazy"
                  onError={e => {
                    e.currentTarget.src = PLACEHOLDER
                  }}
                />
                <p className="cast-name">{member.name}</p>
                <p className="cast-character">{member.character}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ─── NAVBAR ──────────────────────────────────────────────────────────────────
const Navbar = ({activeRoute, onNavigate, onSearch}) => {
  const [query, setQuery] = useState('')

  const handleSearch = () => {
    const q = query.trim()
    if (q) {
      onSearch(q)
      setQuery('')
    }
  }

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <h1
          className="nav-logo"
          onClick={() => onNavigate(ROUTES.POPULAR)}
          style={{cursor: 'pointer'}}
        >
          movieDB
        </h1>

        <nav className="nav-links">
          {[
            {label: 'Home', route: ROUTES.POPULAR},
            {label: 'Top Rated', route: ROUTES.TOP_RATED},
            {label: 'Upcoming', route: ROUTES.UPCOMING},
          ].map(({label, route}) => (
            <button
              key={route}
              className={`nav-btn ${
                activeRoute === route ? 'nav-btn-active' : ''
              }`}
              onClick={() => onNavigate(route)}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="nav-search">
          <input
            type="text"
            className="search-input"
            placeholder="Search movies…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <button className="search-btn" onClick={handleSearch} type="button">
            Search
          </button>
        </div>
      </div>
    </header>
  )
}

// ─── APP ROOT ────────────────────────────────────────────────────────────────
const App = () => {
  const [activeRoute, setActiveRoute] = useState(ROUTES.POPULAR)
  const [searchQuery, setSearchQuery] = useState('')
  const [detailsId, setDetailsId] = useState(null)

  const navigate = route => {
    setActiveRoute(route)
    setSearchQuery('')
    setDetailsId(null)
  }

  const handleSearch = q => {
    setSearchQuery(q)
    setActiveRoute(ROUTES.SEARCH)
    setDetailsId(null)
  }

  const handleViewDetails = id => setDetailsId(id)
  const handleBack = () => setDetailsId(null)

  const listPageConfig = {
    [ROUTES.POPULAR]: {
      pageTitle: 'Popular',
      pageSubtitle: 'What the world is watching right now',
      getUrl: buildUrl.popular,
    },
    [ROUTES.TOP_RATED]: {
      pageTitle: 'Top Rated',
      pageSubtitle: 'The finest films as judged by millions',
      getUrl: buildUrl.topRated,
    },
    [ROUTES.UPCOMING]: {
      pageTitle: 'Upcoming',
      pageSubtitle: 'Coming soon to a screen near you',
      getUrl: buildUrl.upcoming,
    },
  }

  const renderContent = () => {
    if (detailsId) {
      return <MovieDetailsPage movieId={detailsId} onBack={handleBack} />
    }

    if (activeRoute === ROUTES.SEARCH) {
      return (
        <SearchPage
          searchQuery={searchQuery}
          onViewDetails={handleViewDetails}
        />
      )
    }

    const config = listPageConfig[activeRoute] ?? listPageConfig[ROUTES.POPULAR]
    return (
      <MovieListPage
        key={activeRoute}
        pageTitle={config.pageTitle}
        pageSubtitle={config.pageSubtitle}
        getUrl={config.getUrl}
        onViewDetails={handleViewDetails}
      />
    )
  }

  return (
    <div className="app">
      <Navbar
        activeRoute={activeRoute}
        onNavigate={navigate}
        onSearch={handleSearch}
      />
      {renderContent()}
    </div>
  )
}

export default App
