import { createCreative } from "@/lib/creative-actions";

/** Server-rendered "describe a campaign" form (posts to a server action). */
export default function CreativeChat() {
  return (
    <form action={createCreative} className="creative-chat">
      <textarea
        name="prompt"
        rows={3}
        required
        placeholder="bv. zomeractie, 20% korting op alle boeken, vrolijk en zomers"
        className="creative-chat__prompt"
        aria-label="Campagnebeschrijving"
      />
      <div className="creative-chat__row">
        <label className="creative-chat__field">
          <span>Plaatsing</span>
          <select name="placement">
            <option value="feed">Feed (1:1)</option>
            <option value="story">Story (9:16)</option>
            <option value="reels">Reels (9:16)</option>
          </select>
        </label>
        <label className="creative-chat__field">
          <span>Formaat</span>
          <select name="format">
            <option value="image">Afbeelding</option>
          </select>
        </label>
        <button type="submit" className="btn btn--primary">
          Genereer
        </button>
      </div>
    </form>
  );
}
