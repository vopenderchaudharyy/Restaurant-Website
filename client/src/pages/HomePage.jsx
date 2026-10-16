import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Flame,
  Leaf,
  MoveUpRight,
  Utensils,
  Clock,
  Sparkles,
} from 'lucide-react';
import { menu, money } from '../../../shared/menu.js';
import { useStore } from '../context/store.js';
import { ButtonLink, DishCard } from '../components/ui.jsx';
import Reveal from '../components/Reveal.jsx';

export default function HomePage() {
  const { setOverlay } = useStore();
  return (
    <div className="home-v2">
      <section className="fresh-hero container">
        <div className="fresh-hero-copy">
          <div className="season-label">
            <span /> GOOD FOOD. BETTER MOODS.
          </div>
          <h1>
            Your next
            <br />
            great bite.<span className="hero-period">®</span>
          </h1>
          <p>
            Big flavours. Fresh favourites. A table for your people.
            <br className="desktop-break" /> Welcome to your new happy place.
          </p>
          <div className="fresh-hero-actions">
            <ButtonLink to="/menu">
              Find your flavour <ArrowUpRight size={20} />
            </ButtonLink>
            <Link className="quiet-link" to="/booking">
              Book a table <ArrowRight size={18} />
            </Link>
          </div>
          <div className="hero-footnotes">
            <span>
              <Leaf size={17} /> Made fresh
            </span>
            <span>
              <Utensils size={17} /> Dine in or take out
            </span>
          </div>
        </div>
        <div className="hero-food-stage">
          <div className="food-stage-caption">
            <span>THE CRAVING EDIT / 01</span>
            <Flame size={20} />
          </div>
          <img
            className="hero-food-image"
            src="/images/design/pizza.jpg"
            alt="Wood-fired pizza with fresh basil and melted mozzarella"
            fetchPriority="high"
          />
          <div className="food-stage-bottom">
            <div>
              <span>THE ONE YOU COME BACK FOR</span>
              <h2>Slice of happiness.</h2>
            </div>
            <button
              className="round-arrow"
              aria-label="Quick view Margherita Pizza"
              onClick={() => setOverlay({ type: 'dish', id: 'margherita' })}
            >
              <ArrowUpRight />
            </button>
          </div>
          <div className="hero-sticker">
            <Sparkles size={18} />
            <span>
              FRESH.
              <br />
              FIRED.
              <br />
              FAVOURITE.
            </span>
          </div>
          <button
            className="hero-mini-card"
            onClick={() => setOverlay({ type: 'dish', id: 'truffle-pasta' })}
          >
            <img src="/images/design/pasta.jpg" alt="" />
            <span>
              <small>A LITTLE SIDE QUEST</small>
              <strong>Truffle Pasta</strong>
              <b>
                {money(349)} <ArrowUpRight size={16} />
              </b>
            </span>
          </button>
        </div>
      </section>
      <div
        className="flavour-strip"
        aria-label="Freshly made, thoughtfully sourced, seriously delicious"
      >
        <span>FRESHLY MADE</span>
        <Sparkles />
        <span>THOUGHTFULLY SOURCED</span>
        <Sparkles />
        <span>SERIOUSLY DELICIOUS</span>
        <Sparkles />
      </div>
      <Reveal as="section" className="container fresh-favourites">
        <div className="editorial-heading">
          <div>
            <span className="eyebrow">THE USUALS, BUT UNUSUAL</span>
            <h2>
              Meet your new
              <br />
              <span>favourites.</span>
            </h2>
          </div>
          <div>
            <p>Start here. Come back for everything else.</p>
            <Link className="quiet-link" to="/menu">
              The whole menu <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
        <div className="dish-grid home-dishes">
          {menu.slice(0, 4).map((dish) => (
            <DishCard key={dish.id} dish={dish} />
          ))}
        </div>
      </Reveal>
      <Reveal as="section" className="container mood-section">
        <div className="editorial-heading">
          <div>
            <span className="eyebrow">FOLLOW YOUR CRAVING</span>
            <h2>What's your mood?</h2>
          </div>
          <p>There's a plate for that.</p>
        </div>
        <div className="mood-grid">
          <Link to="/menu?category=Pizzas" className="mood-card">
            <img src="/images/design/pizza.jpg" alt="" loading="lazy" />
            <div>
              <small>01 / COMFORT MODE</small>
              <h3>
                Pizza fixes
                <br />
                everything.
              </h3>
              <span>
                Find your slice <ArrowUpRight size={18} />
              </span>
            </div>
          </Link>
          <Link to="/menu?veg=1" className="mood-card mood-green">
            <Leaf size={40} />
            <div>
              <small>02 / PLANT POWER</small>
              <h3>
                Fresh feels.
                <br />
                Full flavour.
              </h3>
              <span>
                Go vegetarian <ArrowUpRight size={18} />
              </span>
            </div>
          </Link>
          <Link to="/menu?category=Desserts" className="mood-card">
            <img src="/images/design/cake.jpg" alt="" loading="lazy" />
            <div>
              <small>03 / TREAT YOURSELF</small>
              <h3>
                Save room
                <br />
                for sweet.
              </h3>
              <span>
                The sweet stuff <ArrowUpRight size={18} />
              </span>
            </div>
          </Link>
        </div>
      </Reveal>
      <Reveal as="section" className="container fresh-story">
        <div className="fresh-story-photo">
          <img
            src="/images/design/restaurant.jpg"
            alt="An inviting dining room for your next get-together"
            loading="lazy"
          />
          <span>
            <Clock size={15} /> SLOW DOWN. STAY A WHILE.
          </span>
        </div>
        <div className="fresh-story-copy">
          <span className="eyebrow">OFFLINE IS A GOOD PLACE TO BE</span>
          <h2>
            Less scrolling.
            <br />
            More sharing.
          </h2>
          <p>
            The catch-ups that turn into dinner. The “one more bite” moments. We're here for all of
            it, with good food at the centre.
          </p>
          <ButtonLink to="/booking">
            Let's make a plan <MoveUpRight size={19} />
          </ButtonLink>
          <Link className="quiet-link" to="/about">
            A little about us <ArrowRight size={17} />
          </Link>
        </div>
      </Reveal>
      <Reveal as="section" className="container fresh-cta">
        <div>
          <span className="eyebrow">YOUR NEXT GOOD PLAN</span>
          <h2>
            Bring your appetite.
            <br />
            We'll bring the rest.
          </h2>
        </div>
        <ButtonLink to="/menu">
          Let's eat <ArrowUpRight size={22} />
        </ButtonLink>
      </Reveal>
    </div>
  );
}
