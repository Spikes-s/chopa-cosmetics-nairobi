import { Link } from 'react-router-dom';
import { Phone, MapPin, Clock } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-2xl font-display font-bold gradient-text mb-4">
              CHOPA COSMETICS
            </h3>
            <p className="text-muted-foreground font-body text-sm leading-relaxed mb-4">
              "Beauty At Your Proximity"
            </p>
            <p className="text-muted-foreground font-body text-sm">
              Your trusted destination for premium cosmetics and beauty products in Kenya.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/products" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Shop All
                </Link>
              </li>
              <li>
                <Link to="/categories" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Categories
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-muted-foreground text-sm">
                <Phone className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                <div>
                  <p>0715167179 – James (Manager)</p>
                  <p>0757435912 – Pius (Manager)</p>
                  <p>0759829850 – Mark (Developer)</p>
                </div>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground text-sm">
                <Clock className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                <span>7:30 AM – 9:00 PM</span>
              </li>
            </ul>
          </div>

          {/* Location */}
          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">Location</h4>
            <div className="flex items-start gap-2 text-muted-foreground text-sm">
              <MapPin className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <div>
                <p className="mb-2">
                  <strong>Main Branch:</strong><br />
                  KAKA HOUSE – OTC, along Racecourse Road, opposite Kaka Travellers Sacco
                </p>
                <p>
                  <strong>Thika Branch:</strong><br />
                  Opposite Family Bank
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Chopa Cosmetics Limited. All rights reserved.
          </p>
          <p className="text-muted-foreground text-xs">
            Prices in Kenyan Shillings (Ksh)
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
