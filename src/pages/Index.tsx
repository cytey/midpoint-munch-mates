import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Utensils, Users, MapPin, Vote, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/hooks/useSession";
import { toast } from "sonner";

export default function Index() {
  const navigate = useNavigate();
  const { createSessionInDb, addParticipantToDb } = useSession(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);

  const startSession = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Please enter your name and email");
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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-md w-full"
      >
        <div className="w-20 h-20 rounded-3xl gradient-primary shadow-warm mx-auto mb-6 flex items-center justify-center">
          <Utensils className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-foreground mb-3">
          meet<span className="text-primary">2</span>eat
        </h1>
        <p className="text-muted-foreground font-body text-lg mb-8">
          Find the perfect meeting spot for your group. Everyone shares their location, we find the middle ground.
        </p>

        <div className="space-y-3 text-left bg-card rounded-2xl p-6 shadow-card border mb-8">
          <h2 className="font-display font-bold text-lg mb-4">Get Started</h2>
          <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="font-body" />
          <Input placeholder="Your email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="font-body" />
          <Button
            onClick={startSession}
            disabled={creating}
            className="w-full gradient-primary text-primary-foreground font-display font-bold text-base h-12 shadow-warm"
          >
            {creating ? "Creating..." : "Create Session"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { icon: Users, label: "Add Friends" },
            { icon: MapPin, label: "Find Middle" },
            { icon: Vote, label: "Vote & Go" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <span className="text-xs font-display font-semibold text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
