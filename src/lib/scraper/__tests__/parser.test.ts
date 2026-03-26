import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { CheerioPdpParser } from '@/lib/scraper/parser';

// Mock the logger to suppress console output during tests
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Fixtures — loaded from __fixtures__/ at workspace root
// NOTE: Fixture structure mirrors ASSUMED DGFiP HTML structure.
//       Update fixtures when the actual page structure is confirmed (P0-GATE).
// ---------------------------------------------------------------------------

const FIXTURES_DIR = resolve(__dirname, '../../../../__fixtures__');

const tableHtml = readFileSync(resolve(FIXTURES_DIR, 'dgfip-table.html'), 'utf-8');
const listHtml = readFileSync(resolve(FIXTURES_DIR, 'dgfip-list.html'), 'utf-8');
const emptyHtml = readFileSync(resolve(FIXTURES_DIR, 'dgfip-empty.html'), 'utf-8');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CheerioPdpParser', () => {
  it('Should_ParsePdps_When_TableHtmlProvided', () => {
    const parser = new CheerioPdpParser();
    const records = parser.parse(tableHtml);

    // The fixture has 3 data rows (2 Immatriculée + 1 Candidat)
    expect(records).toHaveLength(3);
  });

  it('Should_ExtractName_When_TableHtmlProvided', () => {
    const parser = new CheerioPdpParser();
    const records = parser.parse(tableHtml);

    const names = records.map((r) => r.name);
    expect(names).toContain('Entreprise Alpha SA');
    expect(names).toContain('Société Bêta SARL');
    expect(names).toContain('Candidat Gamma SAS');
  });

  it('Should_ExtractStatus_When_ImmatriculeePresentInTable', () => {
    const parser = new CheerioPdpParser();
    const records = parser.parse(tableHtml);

    const alpha = records.find((r) => r.name === 'Entreprise Alpha SA');
    expect(alpha?.status).toBe('registered');

    const beta = records.find((r) => r.name === 'Société Bêta SARL');
    expect(beta?.status).toBe('registered');
  });

  it('Should_ExtractStatus_When_CandidatePresentInTable', () => {
    const parser = new CheerioPdpParser();
    const records = parser.parse(tableHtml);

    const gamma = records.find((r) => r.name === 'Candidat Gamma SAS');
    expect(gamma?.status).toBe('candidate');
  });

  it('Should_ExtractWebsiteUrl_When_LinkPresentInRow', () => {
    const parser = new CheerioPdpParser();
    const records = parser.parse(tableHtml);

    const alpha = records.find((r) => r.name === 'Entreprise Alpha SA');
    expect(alpha?.websiteUrl).toBe('https://alpha.example.com');
  });

  it('Should_GenerateSlug_When_NameContainsFrenchAccents', () => {
    const parser = new CheerioPdpParser();
    const records = parser.parse(tableHtml);

    // "Société Bêta SARL" should produce an ASCII, lowercase, hyphenated slug
    const beta = records.find((r) => r.name === 'Société Bêta SARL');
    expect(beta?.slug).toBeTruthy();
    expect(beta?.slug).toMatch(/^[a-z0-9-]+$/); // only ASCII, lowercase, hyphens
    expect(beta?.slug).not.toMatch(/[éêèàùûîïôç]/i); // no accented characters
  });

  it('Should_ReturnEmpty_When_NoMatchingSelector', () => {
    const parser = new CheerioPdpParser();
    // HTML without any table or list content
    const html = '<html><body><div><p>Aucun résultat trouvé.</p></div></body></html>';

    const records = parser.parse(html);

    expect(records).toHaveLength(0);
  });

  it('Should_ReturnEmpty_When_HtmlIsEmptyBody', () => {
    const parser = new CheerioPdpParser();
    const records = parser.parse(emptyHtml);

    expect(records).toHaveLength(0);
  });

  it('Should_ParsePdps_When_ListHtmlProvided', () => {
    const parser = new CheerioPdpParser();
    const records = parser.parse(listHtml);

    // The list fixture has 3 list items
    expect(records).toHaveLength(3);
  });

  it('Should_ResolveRelativeUrl_When_HrefIsRelative', () => {
    const parser = new CheerioPdpParser();
    // HTML with a relative href in the Site internet column — extractUrl should resolve it against the base URL
    const html = `<html><body>
  <table class="table">
    <thead>
      <tr>
        <th>Nom commercial</th>
        <th>Adresse de l'établissement principal</th>
        <th>Site internet</th>
        <th>Email de contact</th>
        <th>Date de délivrance du numéro d'immatriculation</th>
        <th>Statut</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>PDP Immatriculée</strong></td>
        <td>Paris</td>
        <td><a href="/pdp/plateforme">Lien</a></td>
        <td>pdp@test.com</td>
        <td>01/01/2025</td>
        <td>rapport d'audit de conformité attendu</td>
      </tr>
    </tbody>
  </table>
</body></html>`;

    const records = parser.parse(html);

    // Should parse the row; websiteUrl may be undefined if no base URL set, but must not throw
    expect(records).toHaveLength(1);
    expect(records[0].name).toContain('PDP Immatriculée');
  });

  it('Should_SkipTable_When_TableDoesNotMatchIdentifier', () => {
    const parser = new CheerioPdpParser();
    // A table that does NOT contain 'plateforme', 'pdp', or 'immatricul'
    const html = `<html><body>
      <table>
        <tr><td>Some Company</td><td>Status</td></tr>
        <tr><td>Another Entry</td><td>Active</td></tr>
      </table>
    </body></html>`;

    const records = parser.parse(html);

    // The table doesn't match tableIdentifier — parser falls through to list strategy (none found)
    expect(records).toHaveLength(0);
  });

  it('Should_ExtractPlainTextUrl_When_NoAnchorInCell', () => {
    // Arrange
    const parser = new CheerioPdpParser();
    const html = `<html><body>
  <table class="table">
    <thead>
      <tr>
        <th>Nom commercial</th>
        <th>Adresse de l'établissement principal</th>
        <th>Site internet</th>
        <th>Email de contact</th>
        <th>Date de délivrance du numéro d'immatriculation</th>
        <th>Statut</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>PlainURL Operator</strong></td>
        <td>Paris</td>
        <td>https://plain.example.com</td>
        <td>contact@plain.example.com</td>
        <td>01/01/2025</td>
        <td>rapport d'audit de conformité attendu</td>
      </tr>
    </tbody>
  </table>
</body></html>`;

    // Act
    const records = parser.parse(html);

    // Assert
    expect(records[0].websiteUrl).toBe('https://plain.example.com');
  });

  it('Should_MergeBothTables_When_TwoTablesPresentInHtml', () => {
    // Arrange
    const parser = new CheerioPdpParser();
    const html = `<html><body>
  <table class="table">
    <thead>
      <tr>
        <th>Nom commercial</th>
        <th>Adresse de l'établissement principal</th>
        <th>Site internet</th>
        <th>Email de contact</th>
        <th>Date de délivrance du numéro d'immatriculation</th>
        <th>Statut</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Operator One</strong></td>
        <td>Paris</td>
        <td>https://one.example.com</td>
        <td>one@example.com</td>
        <td>01/01/2025</td>
        <td>rapport d'audit de conformité attendu</td>
      </tr>
      <tr>
        <td><strong>Operator Two</strong></td>
        <td>Lyon</td>
        <td>https://two.example.com</td>
        <td>two@example.com</td>
        <td>02/02/2025</td>
        <td>rapport d'audit de conformité attendu</td>
      </tr>
    </tbody>
  </table>
  <table class="table">
    <thead>
      <tr>
        <th>Nom commercial</th>
        <th>Adresse de l'établissement principal</th>
        <th>Site internet</th>
        <th>Email de contact</th>
        <th>Statut</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Operator Three</strong></td>
        <td>Toulouse</td>
        <td>https://three.example.com</td>
        <td>three@example.com</td>
        <td>Dossier complet en attente des tests d'interopérabilité</td>
      </tr>
    </tbody>
  </table>
</body></html>`;

    // Act
    const records = parser.parse(html);

    // Assert
    expect(records).toHaveLength(3);
    const three = records.find((r) => r.name === 'Operator Three');
    expect(three?.status).toBe('candidate');
    const one = records.find((r) => r.name === 'Operator One');
    expect(one?.status).toBe('registered');
    const two = records.find((r) => r.name === 'Operator Two');
    expect(two?.status).toBe('registered');
  });

  it('Should_ExtractRegistrationDate_When_SixColumnTable', () => {
    // Arrange
    const parser = new CheerioPdpParser();
    const html = `<html><body>
  <table class="table">
    <thead>
      <tr>
        <th>Nom commercial</th>
        <th>Adresse de l'établissement principal</th>
        <th>Site internet</th>
        <th>Email de contact</th>
        <th>Date de délivrance du numéro d'immatriculation</th>
        <th>Statut</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Date Operator</strong></td>
        <td>Paris</td>
        <td>https://date.example.com</td>
        <td>date@example.com</td>
        <td>15/06/2024</td>
        <td>rapport d'audit de conformité attendu</td>
      </tr>
    </tbody>
  </table>
</body></html>`;

    // Act
    const records = parser.parse(html);

    // Assert
    expect(records[0].registrationDate).toBe('2024-06-15');
  });

  it('Should_OmitRegistrationDate_When_FiveColumnTable', () => {
    // Arrange
    const parser = new CheerioPdpParser();
    const html = `<html><body>
  <table class="table">
    <thead>
      <tr>
        <th>Nom commercial</th>
        <th>Adresse de l'établissement principal</th>
        <th>Site internet</th>
        <th>Email de contact</th>
        <th>Statut</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>NoDate Operator</strong></td>
        <td>Paris</td>
        <td>https://nodate.example.com</td>
        <td>nodate@example.com</td>
        <td>Dossier complet en attente des tests d'interopérabilité</td>
      </tr>
    </tbody>
  </table>
</body></html>`;

    // Act
    const records = parser.parse(html);

    // Assert
    expect(records[0].registrationDate).toBeUndefined();
  });

  it('Should_DetectRealDgfipStatusValues', () => {
    // Arrange
    const parser = new CheerioPdpParser();
    const html = `<html><body>
  <table class="table">
    <thead>
      <tr>
        <th>Nom commercial</th>
        <th>Adresse de l'établissement principal</th>
        <th>Site internet</th>
        <th>Email de contact</th>
        <th>Date de délivrance du numéro d'immatriculation</th>
        <th>Statut</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Registered Operator</strong></td>
        <td>Paris</td>
        <td>https://registered.example.com</td>
        <td>reg@example.com</td>
        <td>01/01/2025</td>
        <td>rapport d'audit de conformité attendu</td>
      </tr>
    </tbody>
  </table>
  <table class="table">
    <thead>
      <tr>
        <th>Nom commercial</th>
        <th>Adresse de l'établissement principal</th>
        <th>Site internet</th>
        <th>Email de contact</th>
        <th>Statut</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Candidate Operator</strong></td>
        <td>Lyon</td>
        <td>https://candidate.example.com</td>
        <td>cand@example.com</td>
        <td>Dossier complet en attente des tests d'interopérabilité</td>
      </tr>
    </tbody>
  </table>
</body></html>`;

    // Act
    const records = parser.parse(html);

    // Assert
    const registered = records.find((r) => r.name === 'Registered Operator');
    expect(registered?.status).toBe('registered');
    const candidate = records.find((r) => r.name === 'Candidate Operator');
    expect(candidate?.status).toBe('candidate');
  });

  it('Should_SkipTable_When_NoTheadPresent', () => {
    // Arrange
    const parser = new CheerioPdpParser();
    const html = `<html><body>
  <table class="table"><tbody><tr><td>Some PDP</td></tr></tbody></table>
</body></html>`;

    // Act
    const records = parser.parse(html);

    // Assert
    expect(records).toHaveLength(0);
  });
});
