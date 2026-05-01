import React from "react";
import { Ticket, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TicketFormSectionProps {
  categories: any[];
  selectedCategoryId: string;
  setSelectedCategoryId: (id: string) => void;
  description: string;
  setDescription: (d: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const TicketFormSection = ({
  categories,
  selectedCategoryId,
  setSelectedCategoryId,
  description,
  setDescription,
  onSubmit,
}: TicketFormSectionProps) => (
  <form onSubmit={onSubmit} className="p-6 border border-white/10 bg-white/5 rounded-xl space-y-4">
    <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
      <Ticket size={20} className="text-ov-primary" /> Open a New Request
    </h2>

    <div className="space-y-2">
      <label className="text-sm text-gray-400">Issue Category</label>
      <select
        required
        className="w-full p-3 bg-black/50 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-ov-primary focus:border-transparent outline-none transition-all"
        value={selectedCategoryId}
        onChange={(e) => setSelectedCategoryId(e.target.value)}
      >
        <option value="" disabled>Select an issue...</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>{cat.display_label}</option>
        ))}
      </select>
    </div>

    <div className="space-y-2">
      <label className="text-sm text-gray-400">Description</label>
      <textarea
        required
        rows={3}
        maxLength={2000}
        className="w-full p-3 bg-black/50 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-ov-primary focus:border-transparent outline-none transition-all resize-none"
        placeholder="Please describe the issue..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
    </div>

    <Button type="submit" className="w-full bg-ov-primary hover:bg-ov-primary/90 text-white font-medium">
      <Send size={16} className="mr-2" /> Submit Ticket
    </Button>
  </form>
);

export default TicketFormSection;
