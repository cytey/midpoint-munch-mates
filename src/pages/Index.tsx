import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Utensils, Users, MapPin, Vote, ArrowRight, Mail, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";

const HOW_IT_WORKS = [
  {
    icon: Users,
    title: "1. Add everyone",
    description:
      "Create a session and share the link. Friends join in one tap and drop their location — no account needed.",
  },
  {
    icon: MapPin,
    title: "2. Find the middle",
    description:
      "We calculate the exact midpoint between everyone and search nearby for restaurants, cafés and hangout spots.",
  },
  {
    icon: Vote,
    title: "3. Vote and go",
    description:
      "Everyone votes on their favourite spot. Confirm the winner and the whole group knows where to meet.",
  },
];

export default function Index() {
  const navigate = useNavigate();
  const { createSessionInDb, addParticipantToDb } = useSession(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);

  const startSession = async () => {
    if (!name.trim()) {
      toast.error("Please enter your name to start");
      return;
    }
    setCreating(true);
    try {
      const sessionId = await createSessionInDb();
      const participant = await addParticipantToDb(sessionId, name.trim(), email.trim());
      localStorage.setItem(`m2e_user_${sessionId}`, participant.id);
      navigate(`/session/${sessionId}`);
    } catch {
      toast.error("Failed to create session");
    }
    setCreating(false);
  };

  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-lg w-full"
        >
          <div className="w-20 h-20 rounded-3xl gradient-primary shadow-warm mx-auto mb-6 flex items-center justify-center">
            <Utensils className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-foreground mb-3">
            meet<span className="text-primary">2</span>eat
          </h1>
          <p className="text-xl font-display font-semibold text-foreground mb-2">
            Where should we eat? Let's meet in the middle.
          </p>
          <p className="text-muted-foreground font-body text-lg mb-6">
            Find the halfway point between you and your friends, then pick a spot everyone loves. Free, no sign-up needed.
          </p>

          <div className="space-y-3 text-left bg-card rounded-2xl p-6 shadow-card border mb-6">
            <h2 className="font-display font-bold text-lg mb-4">Get Started</h2>
            <Input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="font-body"
              onKeyDown={(e) => e.key === "Enter" && startSession()}
            />
            <Input
              placeholder="Your email (optional)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="font-body"
            />
            <Button
              onClick={startSession}
              disabled={creating}
              className="w-full gradient-primary text-primary-foreground font-display font-bold text-base h-12 shadow-warm"
            >
              {creating ? "Creating..." : "Create a Session — It's Free"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <p className="text-xs text-muted-foreground font-body text-center pt-1">
              <Clock className="w-3 h-3 inline mr-1" />
              3 steps, 2 minutes — add friends, find the middle, vote.
            </p>
          </div>
        </motion.div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-4 py-16 max-w-4xl mx-auto">
        <h2 className="text-3xl font-display font-extrabold text-foreground text-center mb-3">
          How it works
        </h2>
        <p className="text-muted-foreground font-body text-center mb-10 max-w-xl mx-auto">
          No more endless group-chat debates about where to eat. Here's the whole flow:
        </p>
        <div className="grid sm:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map(({ icon: Icon, title, description }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-2xl p-6 shadow-card border text-center"
            >
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-4">
                <Icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-display font-bold text-lg mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">{description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SOCIAL PROOF / VALUE STRIP */}
      <section className="px-4 py-12">
        <div className="max-w-3xl mx-auto rounded-2xl gradient-accent p-8 text-accent-foreground text-center">
          <Sparkles className="w-8 h-8 mx-auto mb-3" />
          <h2 className="text-2xl font-display font-extrabold mb-2">
            Perfect for every "where shall we meet?" moment
          </h2>
          <p className="opacity-90 font-body">
            Lunch with colleagues between two offices, dinner with friends across town,
            catch-ups between neighbourhoods — anywhere a group needs a fair middle ground.
          </p>
        </div>
      </section>

      {/* SEO / FAQ */}
      <section className="px-4 py-16 max-w-2xl mx-auto">
        <h2 className="text-3xl font-display font-extrabold text-foreground text-center mb-3">
          Frequently asked questions
        </h2>
        <p className="text-muted-foreground font-body text-center mb-8">
          Everything you need to know about finding a meeting point with meet2eat.
        </p>
        <div className="space-y-6">
          <div>
            <h3 className="font-display font-bold text-foreground">Where is meet2eat available?</h3>
            <p className="text-sm text-muted-foreground font-body leading-relaxed">
              meet2eat currently covers Singapore, using official OneMap location data to find
              restaurants, cafés and hawker centres near your group's midpoint.
            </p>
          </div>
          <div>
            <h3 className="font-display font-bold text-foreground">Do my friends need to create an account?</h3>
            <p className="text-sm text-muted-foreground font-body leading-relaxed">
              No. Anyone with the session link can join by entering just their name and dropping
              their location — by sharing their GPS position or typing an address.
            </p>
          </div>
          <div>
            <h3 className="font-display font-bold text-foreground">How is the meeting point chosen?</h3>
            <p className="text-sm text-muted-foreground font-body leading-relaxed">
              We calculate the geographic midpoint of everyone's locations, then search within
              your chosen radius (1–10 km) for places to eat or hang out nearby.
            </p>
          </div>
          <div>
            <h3 className="font-display font-bold text-foreground">Is meet2eat free?</h3>
            <p className="text-sm text-muted-foreground font-body leading-relaxed">
              Yes, completely free. Create as many sessions as you like.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="px-4 pb-16 pt-4 text-center">
        <p className="text-muted-foreground font-body mb-4">Ready to settle the debate?</p>
        <Button onClick={startSession} size="lg" className="gradient-primary text-primary-foreground font-display font-bold h-12 shadow-warm">
          Create a Free Session
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </section>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground font-body">
        <Mail className="w-3 h-3 inline mr-1" />
        meet2eat — meeting point finder for groups in Singapore
      </footer>
    </div>
  );
}
