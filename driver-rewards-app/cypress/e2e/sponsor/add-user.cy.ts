describe('Add User Test via UI', () => {

    beforeEach(() => {
        // Use the custom login command to log in before each test
        cy.login('testsponsor', 'Password1!'); // Pass username and password
      });

    it('Should log in, navigate to Add User page, and successfully add a user', () => {
      // Navigate to the Add User page
      cy.visit('/add-user');
  
      // Fill out the sponsor form
      cy.get('#fname').type('User');
      cy.get('#lname').type('Test');
      cy.get('#email').type('usertest@gmail.com');
      cy.get('#password').type('Password1!');
      cy.get('#phoneNum').type('(555)-123-4567');
      cy.get('#address').type('123 Testing St.');
      cy.get('#city').type('Test City');
      cy.get('#state').type('SC');
      cy.get('#zipCode').type('58712');
      cy.get('#dln').type('5748294732');
      cy.get('#points').type('5000');
      cy.get('#company').type('Test Sponsor');
      
  
      // Submit the form
      cy.get('button[type="submit"]').click();


      // Verify the user is added in the sponsor list
      cy.visit('/adminList'); // Navigate to the sponsor list page
      cy.contains('usertest').should('exist'); // Check for the newly added user
    });
  });
  