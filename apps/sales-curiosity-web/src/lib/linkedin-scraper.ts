import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

export interface LinkedInProfile {
  url: string;
  name: string;
  headline?: string;
  location?: string;
  aboutSection?: string;
  experienceSection?: string;
  educationSection?: string;
  skillsSection?: string;
  fullPageText: string;
}

export async function scrapeLinkedInProfile(profileUrl: string): Promise<LinkedInProfile> {
  let browser;
  
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
      ],
    });

    const page = await browser.newPage();
    
    // Set realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('Navigating to LinkedIn profile:', profileUrl);
    
    // Navigate to the profile
    await page.goto(profileUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait a bit for content to load
    await page.waitForTimeout(2000);

    console.log('Extracting profile data...');

    // Extract profile information
    const profileData = await page.evaluate(() => {
      const getText = (selector: string): string => {
        const element = document.querySelector(selector);
        return element?.textContent?.trim() || '';
      };

      const getAllText = (selector: string): string => {
        const elements = Array.from(document.querySelectorAll(selector));
        return elements.map(el => el.textContent?.trim()).filter(Boolean).join('\n');
      };

      // Extract name (multiple possible selectors)
      const name = getText('h1.text-heading-xlarge') ||
                   getText('h1.inline.t-24') ||
                   getText('.pv-text-details__left-panel h1') ||
                   getText('.ph5 h1');

      // Extract headline
      const headline = getText('.text-body-medium.break-words') ||
                      getText('.pv-text-details__left-panel .text-body-medium') ||
                      getText('.pv-top-card--list-bullet li:first-child');

      // Extract location
      const location = getText('.text-body-small.inline.t-black--light.break-words') ||
                      getText('.pv-text-details__left-panel .pb2.t-black--light.t-14') ||
                      getText('.pv-top-card--list-bullet li:nth-child(2)');

      // Extract About section
      const aboutSection = getText('#about ~ .pvs-list__outer-container .inline-show-more-text') ||
                          getText('.pv-about-section .pv-about__summary-text') ||
                          getText('[data-section="summary"] .inline-show-more-text');

      // Extract Experience section
      const experienceSection = getAllText('#experience ~ .pvs-list__outer-container .pvs-entity') ||
                               getAllText('.pv-profile-section.experience-section .pv-entity__summary-info') ||
                               getAllText('[data-section="experience"] .pvs-entity');

      // Extract Education section
      const educationSection = getAllText('#education ~ .pvs-list__outer-container .pvs-entity') ||
                              getAllText('.pv-profile-section.education-section .pv-entity__summary-info') ||
                              getAllText('[data-section="education"] .pvs-entity');

      // Extract Skills section
      const skillsSection = getAllText('.pv-skill-categories-section .pv-skill-category-entity__name') ||
                           getAllText('[data-section="skills"] .pvs-entity__path-node') ||
                           getAllText('.pvs-list__outer-container .pvs-entity__path-node');

      // Get all visible text as fallback
      const fullPageText = document.body.innerText;

      return {
        name,
        headline,
        location,
        aboutSection,
        experienceSection,
        educationSection,
        skillsSection,
        fullPageText,
      };
    });

    console.log('Profile data extracted successfully');

    return {
      url: profileUrl,
      name: profileData.name || 'Unknown',
      headline: profileData.headline,
      location: profileData.location,
      aboutSection: profileData.aboutSection,
      experienceSection: profileData.experienceSection,
      educationSection: profileData.educationSection,
      skillsSection: profileData.skillsSection,
      fullPageText: profileData.fullPageText,
    };

  } catch (error) {
    console.error('Error scraping LinkedIn profile:', error);
    throw new Error(`Failed to scrape LinkedIn profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
  }
}

