<!--
Brand-kit analysis prompt. Loaded by the `brand-kit` worker step
(apps/local-worker/src/brand-kit.ts). The worker substitutes {{URL}} and
{{PAGE_TEXT}} before sending this to the LLM. Everything below the HTML comment
is the prompt. Keep the output contract EXACT — the worker parses the first
JSON object from the response.
-->
Je bent een merkstrateeg. Je analyseert de website **{{URL}}** voor een Nederlandstalige (nl-BE) klant. Hieronder staat de zichtbare tekst van de pagina.

"""
{{PAGE_TEXT}}
"""

Leid hieruit de merksignalen af. Schrijf in het **Nederlands (nl-BE)**, informeel (**je/jij**), warm en concreet, zonder hype of buzzwords.

Geef **UITSLUITEND geldige JSON** terug — geen uitleg, geen markdown-codeblok — met exact deze velden:

{
  "toneOfVoiceSummary": "1-2 zinnen die de tone of voice van het merk beschrijven",
  "positioning": "1 zin: wat doet dit bedrijf en voor wie",
  "audience": "korte beschrijving van de doelgroep",
  "products": [
    { "name": "naam van product of dienst", "description": "1 korte zin", "price": "prijs indien zichtbaar, anders leeg laten" }
  ]
}

Richtlijnen:
- Baseer je uitsluitend op wat in de tekst staat. Verzin geen producten, prijzen of claims die er niet zijn.
- Als iets niet af te leiden is, laat het veld leeg ("") of de lijst leeg ([]) — liever leeg dan verzonnen.
- Maximaal ~6 producten/diensten; kies de belangrijkste.
- Geen aanhalingstekens of regeleindes die de JSON ongeldig maken.
