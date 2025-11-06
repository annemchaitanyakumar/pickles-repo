import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Youtube, Mail, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export const Footer = () => {
  const { toast } = useToast();

  const ourMenus = [
    { name: 'Chicken Pickle', path: '/products' },
    { name: 'Fish Pickle', path: '/products' },
    { name: 'Prawn Pickle', path: '/products' },
    { name: 'Mixed Veg Pickle', path: '/products' },
    { name: 'Mango Pickle', path: '/products' },
  ];

  const usefulLinks = [
    { name: 'About Us', path: '/about' },
    { name: 'Restaurant', path: '/about' },
    { name: 'Our Chefs', path: '/about' },
    { name: 'Testimonials', path: '/about' },
    { name: 'Privacy Policy', path: '/policies' },
  ];

  const contactInfo = [
    { icon: Phone, text: '+44 (0) 9865 124 765', subtext: '+44 (0) 0941 432 643' },
    { icon: Mail, text: 'www.Homelypickles.com', subtext: 'hello@homelytastepickles.com' },
    { icon: MapPin, text: '11 Beaufort Court,Cana', subtext: 'What,Uk E104AL' },
  ];

  const socialLinks = [
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Youtube, href: '#', label: 'YouTube' },
  ];

  return (
    <footer className="relative text-white">
      {/* Wave Section */}
      <div className="relative h-24">
        {/* Animated Waves */}
        <motion.svg
          className="absolute top-0 left-0 w-full h-24"
          viewBox="0 0 1440 100"
          preserveAspectRatio="none"
          style={{ filter: 'drop-shadow(0 -4px 4px rgba(0,0,0,0.2))' }}
        >
          <defs>
            <linearGradient id="waveGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#2A2A2A" />
              <stop offset="100%" stopColor="#1A1A1A" />
            </linearGradient>
          </defs>
          <motion.path
            d="M0,40L48,42.7C96,45,192,51,288,48C384,45,480,35,576,37.3C672,40,768,56,864,61.3C960,67,1056,61,1152,56C1248,51,1344,45,1392,42.7L1440,40L1440,100L1392,100C1344,100,1248,100,1152,100C1056,100,960,100,864,100C768,100,672,100,576,100C480,100,384,100,288,100C192,100,96,100,48,100L0,100Z"
            fill="#1A1A1A"
            animate={{
              d: [
                "M0,30L48,35C96,40,192,50,288,45C384,40,480,20,576,15C672,10,768,20,864,30C960,40,1056,50,1152,45C1248,40,1344,20,1392,15L1440,10L1440,100L1392,100C1344,100,1248,100,1152,100C1056,100,960,100,864,100C768,100,672,100,576,100C480,100,384,100,288,100C192,100,96,100,48,100L0,100Z",
                "M0,20L48,25C96,30,192,40,288,50C384,60,480,70,576,65C672,60,768,40,864,35C960,30,1056,40,1152,45C1248,50,1344,50,1392,45L1440,40L1440,100L1392,100C1344,100,1248,100,1152,100C1056,100,960,100,864,100C768,100,672,100,576,100C480,100,384,100,288,100C192,100,96,100,48,100L0,100Z"
              ],
              transition: {
                duration: 3,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "reverse"
              }
            }}
          />
        </motion.svg>
      </div>

      {/* Main Content Section */}
      <div className="bg-[#1A1A1A]">
        <div className="container mx-auto px-6">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-10">
            {/* Brand Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-2 md:space-y-4 col-span-1 lg:col-span-1"
            >
              <div className="space-y-2 md:space-y-4">
                <Link to="/" className="flex items-center space-x-2 md:space-x-3">
                  <img src="/HT_Pickles.Logo1.png" alt="Food Zone" className="w-6 h-6 md:w-8 md:h-8" />
                  <h3 className="text-lg md:text-2xl font-bold">Homely Taste Pickles</h3>
                </Link>
                <p className="text-muted-foreground text-sm md:text-sm leading-relaxed">
                  Crafting authentic, traditional pickles with love and care for over 25 years. 
                  Taste the tradition in every jar.
                </p>
              </div>
            </motion.div>

            {/* Menu and Links Section Container */}
            <div className="col-span-1 lg:col-span-2 grid grid-cols-2 gap-6 md:gap-10">
              {/* Our Menus */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="space-y-4"
              >
                <div>
                  <h4 className="text-lg md:text-xl font-semibold mb-2">Our Menus</h4>
                  <ul className="space-y-2 md:space-y-2">
                    {ourMenus.map(item => (
                      <li
                        key={item.name}
                        className="text-gray-400 hover:text-primary transition-colors text-base md:text-base"
                      >
                        <Link to={item.path} className="flex items-center gap-1.5 md:gap-2">
                          <span>→</span>
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>

              {/* Useful Links */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="space-y-4"
              >
                <div>
                  <h4 className="text-lg md:text-xl font-semibold mb-2">Useful Links</h4>
                  <ul className="space-y-2 md:space-y-2">
                    {usefulLinks.map(item => (
                      <li
                        key={item.name}
                        className="text-gray-400 hover:text-primary transition-colors text-base md:text-base"
                      >
                        <Link to={item.path} className="flex items-center gap-1.5 md:gap-2">
                          <span>→</span>
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </div>

            {/* Contact Us */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-4 col-span-1 lg:col-span-1"
            >
              <div>
                <h4 className="text-lg md:text-xl font-semibold mb-2">Contact Us</h4>
                <ul className="space-y-3 md:space-y-4">
                  {contactInfo.map((item, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 md:gap-3 text-gray-400"
                    >
                      <item.icon className="h-5 w-5 md:h-5 md:w-5 mt-1 text-primary shrink-0" />
                      <div className="text-base md:text-base">
                        <p>{item.text}</p>
                        <p className="text-sm md:text-sm">{item.subtext}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>

          {/* Copyright Section */}
          <div className="border-t border-white/10 mt-4 md:mt-6">
            <motion.div 
              className="py-4 md:py-6 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-4 text-sm md:text-sm text-gray-400">
                <motion.span
                  className="bg-primary rounded-full px-3 md:px-4 py-1.5 md:py-1.5 text-white font-medium"
                  whileHover={{ scale: 1.05 }}
                >
                  © {new Date().getFullYear()} Homely Taste Pickles
                </motion.span>
                <motion.div className="flex items-center gap-3 md:gap-4">
                  <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
                  <span className="h-1 w-1 rounded-full bg-gray-700"></span>
                  <Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
                </motion.div>
              </div>

              <motion.div 
                className="flex items-center gap-2 text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <motion.div
                  className="flex items-center"
                  whileHover={{ scale: 1.02 }}
                >
                  <span className="text-gray-500">Crafted with passion by</span>
                  <motion.a
                    href="https://quinzex.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-primary hover:text-primary/90 font-medium"
                    whileHover={{
                      textShadow: "0 0 8px var(--primary)"
                    }}
                  >
                    Quinzex Intelligence
                  </motion.a>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </footer>
  );
};