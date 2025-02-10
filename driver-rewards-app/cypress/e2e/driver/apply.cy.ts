describe('Apply to sponsor', () => {

    // Visit the login page
    cy.visit('/login'); // Adjust this URL to match your login page route
    
    // Fill in the username and password fields
    cy.get('#amplify-id-\\:r2\\:').type('drivertest'); // Escape the `:` in the id
    cy.get('#amplify-id-\\:r5\\:').type('Password1!'); // Escape the `:` in the id
    
    // Click the login button
    cy.get('.amplify-button--primary').click();


    // Fill in change password fields.
    cy.get('#amplify-id-\\:r8\\:').type('Password1!');
    cy.get('#amplify-id-\\:rb\\:').type('Password1');
    cy.get('#amplify-id-\\:re\\:').type('drivertest');

    // Click the change password button.
    cy.get('.amplify-button--primary').click();
    
    // Verify successful login
    cy.url().should('include', '/dashboard'); // Adjust this to the expected post-login URL



    it('Should log in, navigate to Add Sponsor page, and successfully add a sponsor', () => {

      cy.visit('/driverApplication'); 

      cy.get('#sponsorSelect').select('Test Sponsor');
      cy.get('#notes').type('This is a test for driver applications.');
      cy.get('#submitApp').click();

  
      // Verify success notification
      cy.contains('Sponsor Name: Test Sponsor').should('be.visible');
    });
  });
  