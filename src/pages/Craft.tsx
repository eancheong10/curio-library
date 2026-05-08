import { Link } from "react-router-dom";
import { LibraryShell } from "@/components/LibraryShell";
import { PaperCard } from "@/components/PaperCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Scissors, Palette, Wand2 } from "lucide-react";

const PROJECTS = [
  {
    title: "Origami Crane",
    emoji: "🕊️",
    difficulty: "Easy",
    minutes: 10,
    materials: ["1 square of paper"],
    steps: [
      "Fold your paper diagonally both ways and unfold to create an X crease.",
      "Fold horizontally and vertically to add a + crease.",
      "Collapse along the creases to form a square base.",
      "Fold the top edges to the centre line on both sides; fold down the top triangle.",
      "Open and squash to form a bird base, then fold the long flaps up — these become wings, head and tail.",
      "Pull head and tail outward gently, and crease wings down. Pull the wings apart to puff up the body.",
    ],
  },
  {
    title: "Bookmark with a Tassel",
    emoji: "🔖",
    difficulty: "Easy",
    minutes: 15,
    materials: ["Cardstock", "Hole punch", "Embroidery thread", "Scissors"],
    steps: [
      "Cut a strip of cardstock about 5 cm × 18 cm.",
      "Round the corners with scissors.",
      "Punch a hole near the top centre.",
      "Wrap thread around your fingers ~30 times for the tassel, then tie it off.",
      "Loop the tassel through the hole and tighten — you have a beautiful bookmark.",
    ],
  },
  {
    title: "Pressed Flower Card",
    emoji: "🌸",
    difficulty: "Medium",
    minutes: 30,
    materials: ["Fresh small flowers/leaves", "Heavy book", "Cardstock", "Glue", "Tweezers"],
    steps: [
      "Place flowers between two sheets of paper inside a heavy book. Wait 5-10 days.",
      "Fold cardstock in half to make a card.",
      "Arrange dried flowers on the front. Take a photo — it's your blueprint.",
      "Glue each piece down carefully with tweezers and a tiny drop of glue.",
      "Let dry flat for an hour. Optional: cover with clear adhesive film.",
    ],
  },
  {
    title: "Tin-Can Lantern",
    emoji: "🏮",
    difficulty: "Medium",
    minutes: 45,
    materials: ["Empty clean tin can", "Hammer + nail", "Tea light", "Optional: paint"],
    steps: [
      "Fill the can with water and freeze overnight (this prevents denting).",
      "Draw a pattern on the outside with a marker.",
      "Hammer the nail along the pattern to punch holes.",
      "Let the ice melt out, dry the can, paint if you like.",
      "Drop a tea light inside and watch the patterns dance.",
    ],
  },
  {
    title: "Recycled Paper Beads",
    emoji: "📿",
    difficulty: "Easy",
    minutes: 25,
    materials: ["Magazine pages", "Glue stick", "Toothpick", "String"],
    steps: [
      "Cut long thin triangles from colourful magazine pages (1.5 cm wide base, 20 cm long).",
      "Starting from the wide end, roll tightly around a toothpick.",
      "Glue the pointed end down. Slide off the toothpick.",
      "Repeat for many beads in different colours.",
      "Thread through string to make a necklace or bracelet.",
    ],
  },
  {
    title: "Sock Puppet",
    emoji: "🧦",
    difficulty: "Easy",
    minutes: 20,
    materials: ["Old sock", "Buttons", "Felt", "Glue"],
    steps: [
      "Slip the sock over your hand. Tuck the toe between thumb and fingers — that's the mouth.",
      "Glue two buttons above the mouth for eyes.",
      "Cut felt into a tongue, ears, hair — glue them on.",
      "Give your puppet a name and a backstory.",
    ],
  },
];

const Craft = () => {
  return (
    <LibraryShell>
      <section className="container py-8 max-w-5xl">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-3 text-muted-foreground">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back to shelves</Link>
        </Button>

        <div className="mb-8">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground flex items-center gap-3">
            <Scissors className="h-8 w-8 text-leather-red" /> Craft Corner
          </h1>
          <p className="text-muted-foreground italic mt-1">Step away from the screen and make something with your hands.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          {PROJECTS.map((p) => (
            <PaperCard key={p.title} className="p-6 border-l-8 border-l-leather-mustard">
              <div className="flex items-start gap-3 mb-3">
                <div className="text-4xl">{p.emoji}</div>
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground leading-tight">{p.title}</h2>
                  <div className="text-xs text-muted-foreground italic mt-0.5">{p.difficulty} · about {p.minutes} min</div>
                </div>
              </div>
              <div className="text-xs uppercase tracking-widest text-leather-green font-bold mb-1 flex items-center gap-1">
                <Palette className="h-3 w-3" /> You'll need
              </div>
              <ul className="text-sm text-foreground mb-3 list-disc list-inside">
                {p.materials.map((m) => <li key={m}>{m}</li>)}
              </ul>
              <div className="text-xs uppercase tracking-widest text-leather-blue font-bold mb-1 flex items-center gap-1">
                <Wand2 className="h-3 w-3" /> Steps
              </div>
              <ol className="text-sm text-foreground list-decimal list-inside space-y-1">
                {p.steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </PaperCard>
          ))}
        </div>
      </section>
    </LibraryShell>
  );
};

export default Craft;
