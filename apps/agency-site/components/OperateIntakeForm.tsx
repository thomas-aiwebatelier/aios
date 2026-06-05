import { submitOperateIntake } from "@/lib/operate-actions";

/** Server-rendered intake form (progressive — posts to a server action). */
export default function OperateIntakeForm() {
  return (
    <form action={submitOperateIntake} className="intake">
      <label className="intake__field">
        <span>Welke tools gebruik je nu? (komma-gescheiden)</span>
        <input name="toolsUsed" placeholder="bv. Teamleader, Outlook, Excel" />
      </label>
      <label className="intake__field">
        <span>Welk terugkerend werk kost je het meeste tijd?</span>
        <textarea name="tasksToAutomate" rows={3} required />
      </label>
      <label className="intake__field">
        <span>Welke systemen moeten met elkaar praten? (komma-gescheiden)</span>
        <input name="systemsToConnect" placeholder="bv. boekhouding, webshop" />
      </label>
      <label className="intake__field">
        <span>Hoeveel ongeveer per week?</span>
        <input name="volume" placeholder="bv. 50 offertes/week" />
      </label>
      <label className="intake__field">
        <span>Nog iets dat ik moet weten?</span>
        <textarea name="notes" rows={2} />
      </label>
      <button type="submit" className="btn btn--primary">
        Verstuur intake
      </button>
    </form>
  );
}
