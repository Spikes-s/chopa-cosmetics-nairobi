import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Clock, Mail } from 'lucide-react';
import PhoneContactDialog from '@/components/PhoneContactDialog';
import BranchMap from '@/components/BranchMap';

const Contact = () => {
  const [selectedContact, setSelectedContact] = useState<{ phone: string; name: string } | null>(null);

  const contacts = [
    { name: 'James (Manager)', phone: '0715167179' },
    { name: 'Pius (Manager)', phone: '0757435912' },
    { name: 'Mark (Developer)', phone: '0759829850' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
          Contact Us
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Have questions? Reach out to us via phone, WhatsApp, or visit our stores.
        </p>
      </div>

      {/* Map Section */}
      <div className="max-w-4xl mx-auto mb-12">
        <h2 className="text-2xl font-display font-bold text-foreground mb-6 text-center">
          Our Locations
        </h2>
        <BranchMap />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* Phone Numbers */}
        <Card variant="gradient">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary" />
              Phone Numbers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contacts.map((contact) => (
              <button
                key={contact.phone}
                onClick={() => setSelectedContact(contact)}
                className="w-full flex justify-between items-center p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="text-left">
                  <p className="font-medium text-foreground">{contact.name}</p>
                  <p className="text-accent">{contact.phone}</p>
                </div>
                <Phone className="w-4 h-4 text-primary" />
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Hours & Email */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Opening Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
              <span className="text-foreground block mb-1">Every Day</span>
              <span className="font-bold text-accent text-lg">7:30 AM – 9:00 PM</span>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground">Email</span>
              </div>
              <p className="text-muted-foreground text-sm">info@chopacosmetics.co.ke</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Phone Contact Dialog */}
      <PhoneContactDialog
        isOpen={!!selectedContact}
        onClose={() => setSelectedContact(null)}
        phoneNumber={selectedContact?.phone || ''}
        contactName={selectedContact?.name || ''}
      />
    </div>
  );
};

export default Contact;
