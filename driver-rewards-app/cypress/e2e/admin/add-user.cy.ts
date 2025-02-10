describe('Add User Test via UI', () => {

    beforeEach(() => {
        // Use the custom login command to log in before each test
        cy.login('testadmin', 'Password1!'); // Pass username and password
      });

    it('Should log in, navigate to Add User page, and successfully add a sponsor user', () => {
      // Navigate to the Add User page
      cy.visit('/add-user');
  
      // Fill out the sponsor form
      cy.get('#fname').type('[Test] Sponsor');
      cy.get('#lname').type('Tester');
      cy.get('#email').type('sponsortest@gmail.com');
      cy.get('#password').type('Password1!');
      cy.get('#phoneNum').type('(555) 123-4567');
      cy.get('#address').type('123 Testing St.');
      cy.get('#city').type('Test City');
      cy.get('#state').type('SC');
      cy.get('#zipCode').type('58712');
      cy.get('#dln').type('29837429');
      cy.get('#points').type('5000');
      cy.get('#role').select('Sponsor');
      cy.get('#company').type('Test Sponsor');
      
  
      // Submit the form
      cy.get('button[type="submit"]').click();

      cy.contains('User created in Cognito and added to DynamoDB successfully!').should('exist'); // Check for the newly added user
    });

    it('Should log in, navigate to Add User page, and successfully add a driver user', () => {
      // Navigate to the Add User page
      cy.visit('/add-user');
  
      // Fill out the sponsor form
      cy.get('#fname').type('[Test] Driver');
      cy.get('#lname').type('Tester');
      cy.get('#email').type('drivertest@gmail.com');
      cy.get('#password').type('Password1!');
      cy.get('#phoneNum').type('(555) 456-7899');
      cy.get('#address').type('123 Testing St.');
      cy.get('#city').type('Testhatten');
      cy.get('#state').type('SC');
      cy.get('#zipCode').type('58712');
      cy.get('#dln').type('29812319');
      cy.get('#points').type('5000');
      cy.get('#company').type('None');    
  
      // Submit the form
      cy.get('button[type="submit"]').click();

      cy.contains('User created in Cognito and added to DynamoDB successfully!').should('exist'); // Check for the newly added user
    });

    it('Should log in, navigate to manage users page, and successfully check for new users.', () => {
    // Verify the user is added in the sponsor list
    cy.visit('/adminList'); // Navigate to the sponsor list page
    cy.contains('[Test] Sponsor').should('exist'); // Check for the newly added user
    cy.contains('[Test] Driver').should('exist'); // Check for the newly added user
    });
  });
  