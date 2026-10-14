import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import {
  Gavel,
  Bike,
  Search,
  ShieldCheck,
  Clock3,
  ArrowUpRight,
  LogOut,
  LogIn,
  Plus
} from 'lucide-react';
import { api, SOCKET_URL } from './api';
const money = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(n || 0);
const demoBikes = [
  {
    _id: 'demo1',
    title: 'Royal Enfield Continental GT 650',
    make: 'Royal Enfield',
    model: 'Continental GT 650',
    year: 2023,
    mileageKm: 4200,
    currentBid: 218000,
    minIncrement: 1000,
    status: 'live',
    endsAt: new Date(Date.now() + 1000 * 60 * 42).toISOString(),
    imageUrl: ''
  },
  {
    _id: 'demo2',
    title: 'KTM Duke 390',
    make: 'KTM',
    model: 'Duke 390',
    year: 2022,
    mileageKm: 7800,
    currentBid: 176000,
    minIncrement: 1000,
    status: 'live',
    endsAt: new Date(Date.now() + 1000 * 60 * 95).toISOString(),
    imageUrl: ''
  },
  {
    _id: 'demo3',
    title: 'Honda CB350 RS',
    make: 'Honda',
    model: 'CB350 RS',
    year: 2023,
    mileageKm: 3600,
    currentBid: 164000,
    minIncrement: 500,
    status: 'live',
    endsAt: new Date(Date.now() + 1000 * 60 * 140).toISOString(),
    imageUrl: ''
  }
];
export default function App() {
  const [auctions, setAuctions] = useState([]);
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidNotice, setBidNotice] = useState('');
  const [bidLoading, setBidLoading] = useState(false);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('vutto_user') || 'null');
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(
    () => localStorage.getItem('vutto_token') || ''
  );
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showAuth, setShowAuth] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [newAuction, setNewAuction] = useState({
    title: '',
    description: '',
    make: '',
    model: '',
    year: '2022',
    mileageKm: '5000',
    startingPrice: '50000',
    minIncrement: '500',
    startsAt: '',
    endsAt: ''
  });
  async function loadAuctions() {
    try {
      const { data } = await api.get('/auctions');
      setAuctions(data.auctions || []);
    } catch {
      setAuctions([]);
    }
  }
  async function openAuction(auction) {
    setBidNotice('');
    setBidAmount('');
    try {
      const { data } = await api.get(`/auctions/${auction._id}`);
      setSelectedAuction({
        auction: data.auction,
        bids: data.bids || []
      });
    } catch (error) {
      setNotice(error.response?.data?.message || 'Could not load auction details.');
    }
  }
  async function placeBid(e) {
    e.preventDefault();
    if (!token) {
      setSelectedAuction(null);
      setMode('login');
      setShowAuth(true);
      setNotice('Please sign in before placing a bid.');
      return;
    }
    if (!selectedAuction) return;
    const auction = selectedAuction.auction;
    const minimumBid = Number(auction.currentBid) + Number(auction.minIncrement);
    if (!Number.isSafeInteger(Number(bidAmount)) || Number(bidAmount) < minimumBid) {
      setBidNotice(`Your bid must be at least ${money(minimumBid)}.`);
      return;
    }
    setBidLoading(true);
    setBidNotice('');
    try {
      await api.post(`/auctions/${auction._id}/bids`, {
        amount: Number(bidAmount)
      });
      const { data } = await api.get(`/auctions/${auction._id}`);
      setSelectedAuction({
        auction: data.auction,
        bids: data.bids || []
      });
      setBidAmount('');
      setBidNotice('Bid placed successfully!');
      await loadAuctions();
    } catch (error) {
      setBidNotice(
        error.response?.data?.message || 'Could not place your bid. Please try again.'
      );
    } finally {
      setBidLoading(false);
    }
  }
  useEffect(() => {
    loadAuctions();
  }, []);
  // Keep auction cards and the open auction detail synchronized in real time.
  useEffect(() => {
    const auctionId = selectedAuction?.auction?._id;
    if (!auctionId || String(auctionId).startsWith('demo')) return;
    const socket = io(SOCKET_URL);
    const refreshAuctionDetails = async () => {
      try {
        const { data } = await api.get(`/auctions/${auctionId}`);
        setSelectedAuction((current) => {
          if (String(current?.auction?._id) !== String(auctionId)) {
            return current;
          }
          return {
            auction: data.auction,
            bids: data.bids || []
          };
        });
      } catch (error) {
        console.error('Could not refresh auction details:', error.message);
      }
    };
    socket.on('connect', () => {
      socket.emit('auction:join', String(auctionId));
    });
    socket.on('bid:updated', (payload) => {
      if (String(payload?.auctionId) === String(auctionId)) {
        void refreshAuctionDetails();
      }
    });
    socket.on('auction:status', (payload) => {
      if (String(payload?.auctionId) === String(auctionId)) {
        void refreshAuctionDetails();
        void loadAuctions();
      }
    });
    socket.on('auction:updated', (payload) => {
      if (!payload?.auctionId) return;
      setAuctions((current) =>
        current.map((auction) =>
          String(auction._id) === String(payload.auctionId)
            ? {
                ...auction,
                ...(payload.status ? { status: payload.status } : {}),
                ...(Number.isFinite(Number(payload.currentBid))
                  ? { currentBid: Number(payload.currentBid) }
                  : {})
              }
            : auction
        )
      );
      if (String(payload.auctionId) === String(auctionId)) {
        void refreshAuctionDetails();
      }
    });
    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection failed:', error.message);
    });
    return () => {
      socket.emit('auction:leave', String(auctionId));
      socket.disconnect();
    };
  }, [selectedAuction?.auction?._id]);
  async function submitAuth(e) {
    e.preventDefault();
    setLoading(true);
    setNotice('');
    try {
      const { data } = await api.post(
        `/auth/${mode === 'register' ? 'register' : 'login'}`,
        form
      );
      localStorage.setItem('vutto_token', data.token);
      localStorage.setItem('vutto_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setShowAuth(false);
      setNotice(
        `Welcome${data.user.name ? `, ${data.user.name}` : ''}!`
      );
    } catch (error) {
      setNotice(
        error.response?.data?.message ||
          'Could not connect to the API. Check that the backend is running.'
      );
    } finally {
      setLoading(false);
    }
  }
  function logout() {
    localStorage.removeItem('vutto_token');
    localStorage.removeItem('vutto_user');
    setToken('');
    setUser(null);
    setNotice('You have signed out.');
  }
  async function createAuction(e) {
    e.preventDefault();
    setLoading(true);
    setNotice('');
    try {
      if (!imageFile) {
        setNotice('Please select a motorcycle image.');
        setLoading(false);
        return;
      }
      // Step 1: Upload the selected image to Cloudinary.
      const formData = new FormData();
      formData.append('image', imageFile);
      const { data: uploadData } = await api.post(
        '/auctions/upload-image',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      if (!uploadData.imageUrl) {
        throw new Error('Image upload did not return an image URL.');
      }
      // Step 2: Save the auction with the Cloudinary image URL.
      const payload = {
        ...newAuction,
        year: Number(newAuction.year),
        mileageKm: Number(newAuction.mileageKm),
        startingPrice: Number(newAuction.startingPrice),
        minIncrement: Number(newAuction.minIncrement),
        imageUrl: uploadData.imageUrl,
        startsAt: new Date(newAuction.startsAt).toISOString(),
        endsAt: new Date(newAuction.endsAt).toISOString()
      };
      await api.post('/auctions', payload);
      // Step 3: Reset the form and refresh the marketplace.
      setShowCreate(false);
      setImageFile(null);
      setNewAuction({
        title: '',
        description: '',
        make: '',
        model: '',
        year: '2022',
        mileageKm: '5000',
        startingPrice: '50000',
        minIncrement: '500',
        startsAt: '',
        endsAt: ''
      });
      setNotice('Auction created successfully with its motorcycle image.');
      await loadAuctions();
    } catch (error) {
      setNotice(
        error.response?.data?.message ||
          error.message ||
          'Could not create the auction. Check the backend and admin access.'
      );
    } finally {
      setLoading(false);
    }
  }
  const visible = auctions.filter((a) =>
    `${a.title} ${a.make} ${a.model}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  const cards = auctions.length
    ? visible
    : demoBikes.filter((a) =>
        `${a.title} ${a.make} ${a.model}`
          .toLowerCase()
          .includes(search.toLowerCase())
      );
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#">
          <span className="brand-icon">
            <Bike size={22} />
          </span>
          <span>
            vutto<span className="brand-light">.auctions</span>
          </span>
        </a>
        <nav className="nav-links">
          <a href="#auctions">Explore auctions</a>
          <a href="#how">How it works</a>
        </nav>
        <div className="nav-actions">
          {user?.role === 'admin' && (
            <button
              className="button button-outline compact"
              onClick={() => {
                setImageFile(null);
                setShowCreate(true);
              }}
            >
              <Plus size={16} /> Add auction
            </button>
          )}
          {user ? (
            <button
              className="avatar-button"
              title="Sign out"
              onClick={logout}
            >
              <span className="avatar">
                {user.name?.[0]?.toUpperCase() || 'U'}
              </span>
              <span className="hide-mobile">
                {user.name?.split(' ')[0]}
              </span>
              <LogOut size={15} />
            </button>
          ) : (
            <button
              className="button button-dark compact"
              onClick={() => {
                setShowAuth(true);
                setMode('login');
              }}
            >
              <LogIn size={16} /> Sign in
            </button>
          )}
        </div>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="live-dot" /> THE NEXT RIDE STARTS HERE
            </div>
            <h1>
              Find your ride.
              <br />
              <span>Win the bid.</span>
            </h1>
            <p>
              A better way to discover exceptional motorcycles. Follow live
              auctions, place your bid, and ride home with something special.
            </p>
            <div className="hero-actions">
              <a className="button button-lime" href="#auctions">
                Explore live auctions <ArrowUpRight size={17} />
              </a>
              <a className="text-link" href="#how">
                How it works <span>→</span>
              </a>
            </div>
            <div className="hero-proof">
              <div className="proof-avatars">
                <i>R</i>
                <i>K</i>
                <i>A</i>
              </div>
              <span>Built for riders, by riders</span>
              <span className="proof-sep">·</span>
              <span>
                <ShieldCheck size={14} /> Secure bidding
              </span>
            </div>
          </div>
          <div className="hero-art">
            <div className="art-grid"></div>
            <div className="art-label">
              RIDE DIFFERENT <span>↗</span>
            </div>
            <div className="bike-emoji" aria-label="Motorcycle illustration">
              🏍️
            </div>
            <div className="art-bottom">
              <div>
                <small>THE AUCTION EDIT</small>
                <strong>Machines with a story.</strong>
              </div>
              <span className="art-circle">
                <ArrowUpRight size={22} />
              </span>
            </div>
            <div className="art-tag">01 / DISCOVER</div>
          </div>
        </section>
        <section className="stats-strip">
          <div>
            <strong>Transparent</strong>
            <span>Clear current bids</span>
          </div>
          <div>
            <strong>Real-time</strong>
            <span>Live auction updates</span>
          </div>
          <div>
            <strong>Rider-first</strong>
            <span>Made for the community</span>
          </div>
        </section>
        <section className="auction-section" id="auctions">
          <div className="section-heading">
            <div>
              <div className="eyebrow muted">YOUR NEXT OBSESSION</div>
              <h2>
                Auctions worth chasing<span>.</span>
              </h2>
              <p>
                Find the machine that makes you look back after parking.
              </p>
            </div>
            <label className="searchbox">
              <Search size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search bikes, brands..."
              />
            </label>
          </div>
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button onClick={() => setNotice('')}>×</button>
            </div>
          )}
          {!auctions.length && (
            <div className="demo-note">
              Preview mode · Connect the backend and add auctions to show live
              listings.
            </div>
          )}
          <div className="auction-grid">
            {cards.map((a, i) => (
              <article className="auction-card" key={a._id}>
                <div className={`bike-visual bike-visual-${i % 3}`}>
                  <div className="card-topline">
                    <span className="status-pill">
                      <span className="live-dot" />
                      {a.status === 'live'
                        ? 'LIVE AUCTION'
                        : a.status?.toUpperCase()}
                    </span>
                    <button
                      className="save-button"
                      title="Save listing"
                      onClick={() =>
                        setNotice(
                          'Watchlist will be added in the next milestone.'
                        )
                      }
                    >
                      ♡
                    </button>
                  </div>
                  {a.imageUrl ? (
                    <img src={a.imageUrl} alt={a.title} />
                  ) : (
                    <div className="bike-symbol">
                      <Bike size={82} strokeWidth={1.15} />
                    </div>
                  )}
                  <span className="bike-year">{a.year}</span>
                </div>
                <div className="card-content">
                  <div className="bike-category">
                    {a.make || 'MOTORCYCLE'} <span>·</span>{' '}
                    {a.mileageKm?.toLocaleString('en-IN') || '—'} KM
                  </div>
                  <h3>{a.title}</h3>
                  <div className="bid-row">
                    <div>
                      <span className="field-label">CURRENT BID</span>
                      <strong>{money(a.currentBid)}</strong>
                    </div>
                    <div className="time-left">
                      <Clock3 size={15} />
                      <span>
                        {a.status === 'live' ? 'Live now' : a.status}
                      </span>
                    </div>
                  </div>
                  <button
                    className="bid-button"
                    onClick={() => openAuction(a)}
                  >
                    View auction <ArrowUpRight size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          {cards.length === 0 && (
            <div className="empty-state">
              No auctions match your search. Try another bike or brand.
            </div>
          )}
        </section>
        <section className="how-section" id="how">
          <div>
            <div className="eyebrow muted">SIMPLE BY DESIGN</div>
            <h2>
              Your next ride in <span>three steps.</span>
            </h2>
          </div>
          <div className="how-grid">
            <div>
              <span className="step-no">01</span>
              <Search />
              <h3>Discover</h3>
              <p>
                Explore motorcycles and review their details before you bid.
              </p>
            </div>
            <div>
              <span className="step-no">02</span>
              <Gavel />
              <h3>Place your bid</h3>
              <p>Make a valid bid and follow the action as it happens.</p>
            </div>
            <div>
              <span className="step-no">03</span>
              <Bike />
              <h3>Ride away</h3>
              <p>
                Track the result and see who wins when the auction closes.
              </p>
            </div>
          </div>
        </section>
      </main>
      <footer>
        <a className="brand footer-brand" href="#">
          <span className="brand-icon">
            <Bike size={19} />
          </span>
          <span>
            vutto<span className="brand-light">.auctions</span>
          </span>
        </a>
        <span>Built with care for the next great ride.</span>
        <span>© 2026 Vutto Auctions · Assignment project</span>
      </footer>
      {selectedAuction && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedAuction(null);
          }}
        >
          <section
            className="modal"
            style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <button
              className="modal-close"
              onClick={() => setSelectedAuction(null)}
            >
              ×
            </button>
            {selectedAuction.auction.imageUrl && (
              <img
                src={selectedAuction.auction.imageUrl}
                alt={selectedAuction.auction.title}
                style={{
                  width: '100%',
                  maxHeight: '280px',
                  objectFit: 'cover',
                  borderRadius: '12px',
                  marginBottom: '20px'
                }}
              />
            )}
            <div className="eyebrow muted">
              {selectedAuction.auction.status?.toUpperCase()} AUCTION
            </div>
            <h2>{selectedAuction.auction.title}</h2>
            <p>{selectedAuction.auction.description}</p>
            <p>
              <strong>Make:</strong> {selectedAuction.auction.make}
              {' · '}
              <strong>Model:</strong> {selectedAuction.auction.model}
            </p>
            <p>
              <strong>Year:</strong> {selectedAuction.auction.year}
              {' · '}
              <strong>Mileage:</strong>{' '}
              {Number(selectedAuction.auction.mileageKm || 0).toLocaleString('en-IN')} km
            </p>
            <div
              style={{
                background: '#f3f4ed',
                padding: '18px',
                borderRadius: '12px',
                margin: '18px 0'
              }}
            >
              <div className="field-label">CURRENT BID</div>
              <h2 style={{ margin: '6px 0' }}>
                {money(selectedAuction.auction.currentBid)}
              </h2>
              <p>
                Minimum next bid:{' '}
                <strong>
                  {money(
                    Number(selectedAuction.auction.currentBid) +
                      Number(selectedAuction.auction.minIncrement)
                  )}
                </strong>
              </p>
              <p>
                Ends:{' '}
                {new Date(selectedAuction.auction.endsAt).toLocaleString('en-IN')}
              </p>
            </div>
            {selectedAuction.auction.status === 'ended' && (
              <div
                style={{
                  background: '#f3f4ed',
                  border: '1px solid #d9dfc9',
                  padding: '18px',
                  borderRadius: '12px',
                  margin: '18px 0'
                }}
              >
                <h3 style={{ margin: '0 0 10px' }}>🏆 Auction Result</h3>
                {selectedAuction.auction.winner ? (
                  <>
                    <p style={{ margin: '0 0 6px', color: '#555' }}>
                      Congratulations to the winner!
                    </p>
                    <p style={{ margin: '0 0 12px', fontSize: '20px', fontWeight: 700 }}>
                      {typeof selectedAuction.auction.winner === 'object'
                        ? selectedAuction.auction.winner.name || 'Winner'
                        : 'Winner ID: ' + selectedAuction.auction.winner}
                    </p>
                    <div className="field-label">WINNING BID</div>
                    <h3 style={{ margin: '6px 0 0' }}>
                      {money(
                        selectedAuction.auction.winningBid ??
                        selectedAuction.auction.currentBid
                      )}
                    </h3>
                  </>
                ) : (
                  <p style={{ margin: 0 }}>
                    No winner was recorded for this auction.
                  </p>
                )}
              </div>
            )}
            {selectedAuction.auction.status === 'live' && (
              <form onSubmit={placeBid}>
                <label>
                  Your bid amount (₹)
                  <input
                    type="number"
                    min={
                      Number(selectedAuction.auction.currentBid) +
                      Number(selectedAuction.auction.minIncrement)
                    }
                    step="1"
                    required
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder="Enter your bid"
                  />
                </label>
                <button
                  className="button button-lime full"
                  disabled={bidLoading}
                  style={{ marginTop: '12px' }}
                >
                  {bidLoading ? 'Placing bid…' : 'Place bid'}
                  <Gavel size={16} />
                </button>
              </form>
            )}
            {bidNotice && (
              <div className="notice" role="status" style={{ marginTop: '14px' }}>
                {bidNotice}
              </div>
            )}
            <h3 style={{ marginTop: '24px' }}>Recent bids</h3>
            {selectedAuction.bids.length === 0 ? (
              <p>No bids yet. Be the first to bid when this auction goes live.</p>
            ) : (
              <div>
                {selectedAuction.bids.map((bid) => (
                  <div
                    key={bid._id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '12px 0',
                      borderBottom: '1px solid #e5e7eb'
                    }}
                  >
                    <div>
                      <strong>{bid.bidder?.name || 'Bidder'}</strong>
                      <div style={{ fontSize: '12px', color: '#777' }}>
                        {new Date(bid.createdAt).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <strong>{money(bid.amount)}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
      {showAuth && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowAuth(false);
          }}
        >
          <section className="modal">
            <button
              className="modal-close"
              onClick={() => setShowAuth(false)}
            >
              ×
            </button>
            <div className="modal-mark">
              <Bike size={24} />
            </div>
            <div className="eyebrow muted">
              {mode === 'register' ? 'JOIN THE COMMUNITY' : 'WELCOME BACK'}
            </div>
            <h2>
              {mode === 'register'
                ? 'Create your account'
                : 'Sign in to Vutto'}
            </h2>
            <p>
              {mode === 'register'
                ? 'Your next ride is waiting.'
                : 'Pick up where your next ride begins.'}
            </p>
            <form onSubmit={submitAuth}>
              {mode === 'register' && (
                <label>
                  Full name
                  <input
                    required
                    minLength="2"
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    placeholder="Your name"
                  />
                </label>
              )}
              <label>
                Email address
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  placeholder="you@example.com"
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  required
                  minLength="8"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="At least 8 characters"
                />
              </label>
              <button
                className="button button-lime full"
                disabled={loading}
              >
                {loading
                  ? 'Please wait…'
                  : mode === 'register'
                    ? 'Create account'
                    : 'Sign in'}
                <ArrowUpRight size={16} />
              </button>
            </form>
            <div className="switch-auth">
              {mode === 'register'
                ? 'Already have an account?'
                : 'New to Vutto?'}{' '}
              <button
                onClick={() =>
                  setMode(mode === 'register' ? 'login' : 'register')
                }
              >
                {mode === 'register' ? 'Sign in' : 'Create account'}
              </button>
            </div>
          </section>
        </div>
      )}
      {showCreate && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreate(false);
              setImageFile(null);
            }
          }}
        >
          <section className="modal create-modal">
            <button
              className="modal-close"
              onClick={() => {
                setShowCreate(false);
                setImageFile(null);
              }}
            >
              ×
            </button>
            <div className="eyebrow muted">ADMIN CONSOLE</div>
            <h2>Create an auction</h2>
            <form onSubmit={createAuction}>
              <label>
                Listing title
                <input
                  required
                  value={newAuction.title}
                  onChange={(e) =>
                    setNewAuction({
                      ...newAuction,
                      title: e.target.value
                    })
                  }
                />
              </label>
              <div className="form-two">
                <label>
                  Make
                  <input
                    required
                    value={newAuction.make}
                    onChange={(e) =>
                      setNewAuction({
                        ...newAuction,
                        make: e.target.value
                      })
                    }
                  />
                </label>
                <label>
                  Model
                  <input
                    required
                    value={newAuction.model}
                    onChange={(e) =>
                      setNewAuction({
                        ...newAuction,
                        model: e.target.value
                      })
                    }
                  />
                </label>
              </div>
              <div className="form-two">
                <label>
                  Year
                  <input
                    type="number"
                    min="1900"
                    max="2100"
                    required
                    value={newAuction.year}
                    onChange={(e) =>
                      setNewAuction({
                        ...newAuction,
                        year: e.target.value
                      })
                    }
                  />
                </label>
                <label>
                  Mileage (km)
                  <input
                    type="number"
                    min="0"
                    required
                    value={newAuction.mileageKm}
                    onChange={(e) =>
                      setNewAuction({
                        ...newAuction,
                        mileageKm: e.target.value
                      })
                    }
                  />
                </label>
              </div>
              <label>
                Description
                <textarea
                  required
                  value={newAuction.description}
                  onChange={(e) =>
                    setNewAuction({
                      ...newAuction,
                      description: e.target.value
                    })
                  }
                />
              </label>
              <label>
                Motorcycle image (JPG, PNG or WebP; max 5 MB)
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  onChange={(e) =>
                    setImageFile(e.target.files?.[0] || null)
                  }
                />
              </label>
              {imageFile && (
                <p className="field-label">
                  Selected image: {imageFile.name}
                </p>
              )}
              <div className="form-two">
                <label>
                  Starting price (₹)
                  <input
                    type="number"
                    min="1"
                    required
                    value={newAuction.startingPrice}
                    onChange={(e) =>
                      setNewAuction({
                        ...newAuction,
                        startingPrice: e.target.value
                      })
                    }
                  />
                </label>
                <label>
                  Minimum increment (₹)
                  <input
                    type="number"
                    min="1"
                    required
                    value={newAuction.minIncrement}
                    onChange={(e) =>
                      setNewAuction({
                        ...newAuction,
                        minIncrement: e.target.value
                      })
                    }
                  />
                </label>
              </div>
              <div className="form-two">
                <label>
                  Starts at
                  <input
                    type="datetime-local"
                    required
                    value={newAuction.startsAt}
                    onChange={(e) =>
                      setNewAuction({
                        ...newAuction,
                        startsAt: e.target.value
                      })
                    }
                  />
                </label>
                <label>
                  Ends at
                  <input
                    type="datetime-local"
                    required
                    value={newAuction.endsAt}
                    onChange={(e) =>
                      setNewAuction({
                        ...newAuction,
                        endsAt: e.target.value
                      })
                    }
                  />
                </label>
              </div>
              <button
                className="button button-lime full"
                disabled={loading}
              >
                {loading
                  ? 'Uploading image and creating…'
                  : 'Create auction'}
                <ArrowUpRight size={16} />
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
