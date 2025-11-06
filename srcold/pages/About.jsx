import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Users, Heart, Award, Clock } from 'lucide-react';

const About = () => {
  const stats = [
    { icon: Users, label: 'Happy Customers', value: '10,000+' },
    { icon: Heart, label: 'Years of Experience', value: '25+' },
    { icon: Award, label: 'Quality Recipes', value: '50+' },
    { icon: Clock, label: 'Fresh Daily', value: '100%' }
  ];

  const features = [
    {
      title: 'Traditional Recipes',
      description: 'Authentic family recipes passed down through generations, preserving the true taste of homemade pickles.',
      image: '/placeholder.svg'
    },
    {
      title: 'Premium Ingredients',
      description: 'We source only the finest, freshest ingredients to ensure every pickle meets our high-quality standards.',
      image: '/placeholder.svg'
    },
    {
      title: 'Handcrafted Process',
      description: 'Each batch is carefully prepared by hand, maintaining the traditional methods that make our pickles special.',
      image: '/placeholder.svg'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6 gradient-primary bg-clip-text text-transparent">
              About Homely Taste Pickles
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              For over 25 years, we've been crafting the finest pickles using traditional family recipes. 
              Our passion for authentic flavors and premium quality has made us a trusted name in households across the region.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="h-8 w-8 text-primary" />
                </div>
                <div className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Our Story</h2>
            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <p>
                It all started in 1998 when our founder, inspired by her grandmother's traditional pickle recipes, 
                decided to share these authentic flavors with the world. What began as a small home kitchen operation 
                has grown into a beloved brand known for quality and authenticity.
              </p>
              <p>
                We believe that great pickles are more than just food – they're a connection to tradition, 
                a burst of flavor that brings families together, and a testament to the art of preservation 
                that has been perfected over generations.
              </p>
              <p>
                Today, we continue to honor those traditional methods while embracing modern food safety standards, 
                ensuring that every jar of pickle that leaves our facility meets the highest quality standards.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-bold text-center mb-12"
          >
            What Makes Us Special
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="bg-card rounded-lg p-6 text-center shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-8 h-8 bg-primary rounded-full"></div>
                </div>
                <h3 className="text-xl font-semibold mb-4">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;