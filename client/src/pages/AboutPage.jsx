import { Leaf, Heart, ChefHat, Sparkles, ArrowRight } from 'lucide-react';
import { ButtonLink, SectionHeading } from '../components/ui.jsx';

export default function AboutPage() {
  return (
    <>
      <section className="about-intro container">
        <div className="about-photo">
          <img
            src="/images/design/chef.jpg"
            alt="Chef preparing fresh dishes in a restaurant kitchen"
          />
          <span className="image-label">A passion you can taste.</span>
        </div>
        <div>
          <span className="eyebrow">A WARM WELCOME, ALWAYS</span>
          <h1>
            Food brings us together.
            <br />
            <em>That’s our story.</em>
          </h1>
          <p>
            At MenuMate, we believe food is more than just a meal. It’s an experience. A reason to
            pause, to reconnect, and to celebrate the everyday.
          </p>
          <p>
            Our kitchen brings together fresh ingredients, familiar comforts and a little creative
            curiosity. Every dish is made with care, and every guest is welcomed like an old friend.
          </p>
          <p>
            From our first table to your next visit, one thing stays the same: our love of bringing
            people together over good food.
          </p>
          <ButtonLink to="/menu" secondary>
            Meet your next favourite <ArrowRight size={17} />
          </ButtonLink>
        </div>
      </section>
      <div className="stats-strip container">
        {[
          ['12+', 'Years around the table'],
          ['50+', 'Thoughtfully crafted dishes'],
          ['5K+', 'Happy food memories'],
          ['100%', 'Made with heart'],
        ].map(([value, label]) => (
          <div key={value}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <section className="section values-section">
        <div className="container">
          <SectionHeading
            eyebrow="THE THINGS THAT MATTER"
            title="A little care makes all the difference."
            text="Our recipe is simple. Good ingredients, good people, and a generous spirit."
          />
          <div className="values-grid">
            {[
              [
                Leaf,
                'Fresh comes first',
                'Seasonal produce, thoughtful sourcing and flavours that speak for themselves.',
              ],
              [
                ChefHat,
                'Crafted with care',
                'A little curiosity, a lot of experience and a kitchen that never stops caring.',
              ],
              [
                Heart,
                'People at the heart',
                'A warm welcome, a familiar smile and a table where everyone belongs.',
              ],
              [
                Sparkles,
                'Small things, done well',
                'From the first bite to the last goodbye, it’s the details that make a difference.',
              ],
            ].map(([Icon, title, text]) => (
              <article key={title}>
                <Icon strokeWidth={1.3} size={34} />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="reservation-banner container">
        <div>
          <span className="eyebrow light">LET’S MAKE A MEMORY</span>
          <h2>There’s always room for you.</h2>
          <p>We’d love to have you over.</p>
        </div>
        <ButtonLink to="/booking">
          Find your table <ArrowRight size={17} />
        </ButtonLink>
      </section>
    </>
  );
}
