describe('Add Sponsor Test via UI', () => {

    beforeEach(() => {
        // Use the custom login command to log in before each test
        cy.login('admin01', 'Password1!'); // Pass username and password
      });

    it('Should log in, navigate to Add Sponsor page, and successfully add a sponsor', () => {
      // Navigate to the Add Sponsor page
      cy.visit('/add-sponsor'); // Adjust this URL to match your add-sponsor page route
  
      // Fill out the sponsor form
      cy.get('#sponsorName').type('Test Sponsor');
      cy.get('#sponsorAddress').type('123 Testing St.');
      cy.get('#city').type('Test City');
      cy.get('#state').type('SC');
      cy.get('#zipCode').type('58712');
      cy.get('#phoneNum').type('(555)-123-4567');
      cy.get('#email').type('testsponsor@gmail.com');
      cy.get('#pointsPerUnit').type('5');
      
  
      // Submit the form
      cy.get('button[type="submit"]').click();

  
      // Verify success notification
      cy.contains('Sponsor added successfully!').should('be.visible');
  
      // Verify the sponsor is added in the sponsor list
      cy.visit('/adminList'); // Navigate to the sponsor list page
      cy.contains('Test Sponsor').should('exist'); // Check for the newly added sponsor
    });
  });
  