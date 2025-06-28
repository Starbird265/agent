describe('AI Traineasy MVP Flow', () => {
  it('signs up, logs in, creates a project, uploads data, and starts training', () => {
    cy.visit('/'); // Assumes frontend runs on the baseUrl configured in cypress.config.js or default (e.g. http://localhost:5173)

    // 0. Initial state: should see login/signup form
    cy.contains('Login').should('be.visible');
    cy.contains('Sign Up').should('be.visible');

    // 1. Sign up (toggling to signup view)
    // This assumes the default view is login, and user needs to click to switch to signup.
    // Adjust if the default or toggle mechanism is different.
    // For this test, let's assume it starts on login and we click "Need an account?"
    cy.contains('Need an account?').click();

    // Use more specific selectors if possible, like IDs or data-cy attributes
    // For now, using name attributes as per user's example.
    // Ensure unique emails for each test run if backend doesn't clear users.
    const uniqueEmail = `test-${Date.now()}@example.com`;
    cy.get('input[id="email"]').type(uniqueEmail); // Changed to id selector based on App.jsx
    cy.get('input[id="password"]').type('secret123');
    cy.get('input[id="inviteCode"]').type('TESTCODE123'); // Assuming a valid, unredeemed invite code exists
    cy.get('button[type="submit"]').contains('Sign Up').click();

    // 2. Successful signup should lead to being logged in (main app view)
    //    The current App.jsx auto-logins after signup by fetching a token.
    //    A good check here is that the auth form is gone and some logged-in UI is present.
    cy.contains('Logout').should('be.visible'); // A common element for logged-in state
    cy.contains(`Welcome, ${uniqueEmail}`).should('be.visible');

    // 3. Create a new project
    const projectName = `Cypress Test Project ${Date.now()}`;
    cy.get('input[placeholder="New Project Name"]').type(projectName);
    cy.contains('button', 'Create Project').click();
    cy.contains(`Current Project: ${projectName}`).should('be.visible');

    // 4. Upload a small CSV (using attachFile which needs cypress-file-upload or native support in Cypress 9.6.0+)
    // Assuming cypress-file-upload is NOT installed, using a simpler method if possible,
    // or noting this dependency. For now, assuming native `attachFile` works for basic cases.
    // The user's example used cy.fixture(...).then(...) which is good.
    cy.fixture('sample.csv').then(fileContent => {
      // The input might be hidden or styled. Need a robust selector.
      // Let's assume there's a data-cy attribute for easier selection.
      // If not, might need to find by a label or a more complex selector.
      // For now, assuming a generic input type=file.
      // If react-dropzone is used, the interaction is different (drag-n-drop or click to open dialog).
      // This part is highly dependent on the actual DatasetBuilder.jsx implementation.
      // The following is a placeholder for a typical file input.
      // cy.get('input[type="file"]').attachFile({ // This might need cypress-file-upload
      //   fileContent: fileContent.toString(),
      //   fileName: 'sample.csv',
      //   mimeType: 'text/csv',
      // });

      // If react-dropzone, it might be:
      cy.get('.cursor-pointer[role="button"]').first().selectFile({ // A common pattern for react-dropzone
          contents: Cypress.Buffer.from(fileContent),
          fileName: 'sample.csv',
          mimeType: 'text/csv',
          lastModified: Date.now(),
      }, { force: true }); // force true if input is hidden
    });

    // Wait for file preview or next step to be available
    cy.contains('Label Columns').should('be.visible'); // Assuming LabelingTool appears

    // 5. Label schema and save (Highly dependent on LabelingTool.jsx selectors)
    // These are placeholder selectors.
    cy.get('button').contains('col1').click(); // Select 'col1' as input
    cy.get('select').select('target'); // Select 'target' as output (might need more specific selector for the select)
    cy.contains('button', 'Save Schema').click();
    cy.contains('Training Controls').should('be.visible'); // Wait for TrainingWizard

    // 6. Start training on CPU (default device)
    cy.contains('button', 'Start Training').click();
    // Check for a status like "Training Queued..." or "Training Running..."
    // The exact text depends on TrainingWizard.jsx's buttonText logic
    cy.contains(/Training (Queued|Running)/).should('be.visible');

    // Further checks could involve polling the status or history via UI elements.
  });
});
