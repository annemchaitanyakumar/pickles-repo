import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Youtube, Mail, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

export const Footer = () => {
  const quickLinks = [
    { name: 'Home', path: '/' },
    { name: 'Products', path: '/products' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
    { name: 'Policies', path: '/policies' }
  ];

  const productCategories = [
    'Chicken Pickle',
    'Mutton Pickle',
    'Fish Pickle',
    'Prawn Pickle',
    'Mango Pickle',
    'Mixed Veg Pickle'
  ];

  const socialLinks = [
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Youtube, href: '#', label: 'YouTube' }
  ];

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-12">
        {/* Main Footer Content */}
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8 mb-8">
          {/* Brand Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">HP</span>
              </div>
              <span className="text-xl font-bold gradient-primary bg-clip-text text-transparent">
                Homely Taste Pickles
              </span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Crafting authentic, traditional pickles with love and care for over 25 years. 
              Taste the tradition in every jar.
            </p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>123 Pickle Street, Flavor Town</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>+1 (555) 123-4567</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>hello@homelytastepickles.com</span>
              </div>
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="pt-2">
              <h4 className="font-medium mb-2">Legal</h4>
              <ul className="space-y-1">
                <li>
                  <a href="/policies" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/policies" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="/policies" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    Refund Policy
                  </a>
                </li>
              </ul>
            </div>
          </motion.div>

          {/* Product Categories */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold">Our Products</h3>
            <ul className="space-y-2">
              {productCategories.map((category) => (
                <li key={category}>
                  <Link
                    to="/products"
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    {category}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Newsletter Signup */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold">Stay Updated</h3>
            <p className="text-muted-foreground text-sm">
              Subscribe to our newsletter for new products, recipes, and special offers.
            </p>
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Enter your email"
                className="text-sm"
              />
              <Button className="w-full" size="sm">
                Subscribe
              </Button>
            </div>
            <div>
              <p className="text-sm font-medium mb-3">Follow Us</p>
              <div className="flex space-x-2">
                {socialLinks.map((social) => (
                  <Button
                    key={social.label}
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    asChild
                  >
                    <a href={social.href} aria-label={social.label}>
                      <social.icon className="h-4 w-4" />
                    </a>
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        <Separator className="mb-6" />

        {/* Bottom Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0"
        >
          <p className="text-muted-foreground text-sm">
            © 2025 Homely Taste Pickles. All rights reserved.
          </p>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>Made with ❤️ for pickle lovers</span>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};