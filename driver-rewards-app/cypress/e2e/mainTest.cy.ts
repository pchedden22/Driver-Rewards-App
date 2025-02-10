


/*
    ADMIN:
    Adds in new sponsor.
*/
describe('[A] Adds new Sponsor via UI', () => {

    beforeEach(() => {
        // Use the custom login command to log in before each test
        cy.login('testadmin', 'Password1!'); // Pass username and password
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

  
      // Verify the sponsor is added in the sponsor list
      cy.visit('/adminList'); // Navigate to the sponsor list page
      cy.contains('Test Sponsor').should('exist'); // Check for the newly added sponsor
    });
  });



/*
    ADMIN:
    Creates sponsor and driver users.
*/
describe('[A] Add User Test via UI', () => {

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

        //cy.contains('User created in Cognito and added to DynamoDB successfully!').should('exist'); // Check for the newly added user
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

        //cy.contains('User created in Cognito and added to DynamoDB successfully!').should('exist'); // Check for the newly added user
    });

    it('Should log in, navigate to manage users page, and successfully check for new users.', () => {
        // Verify the user is added in the sponsor list
        cy.visit('/adminList'); // Navigate to the sponsor list page
        cy.contains('[Test] Sponsor').should('exist'); // Check for the newly added user
        cy.contains('[Test] Driver').should('exist'); // Check for the newly added user
    });
});



/*
    DRIVER:
    Applies to Sponsor Test.
*/
describe('[D] Apply to sponsor', () => {


    it('Should log in, navigate to Add Sponsor page, and successfully add a sponsor', () => {
    // Visit the login page
    cy.visit('/login'); // Adjust this URL to match your login page route
    
    // Fill in the username and password fields
    cy.get('#amplify-id-\\:r2\\:').type('drivertest'); // Escape the `:` in the id
    cy.get('#amplify-id-\\:r5\\:').type('Password1!'); // Escape the `:` in the id
    
    // Click the login button
    cy.get('.amplify-button--primary').click();


    // Fill in change password fields.
    cy.get('#amplify-id-\\:r8\\:').should('be.visible').type('Password1!');
    cy.get('#amplify-id-\\:rb\\:').type('Password1!');
    cy.get('#amplify-id-\\:re\\:').type('drivertest');

    // Click the change password button.
    cy.get('.amplify-button--primary').click();

    cy.contains('Skip').should('exist').click();
    
    // Verify successful login
    cy.url().should('include', '/dashboard'); // Adjust this to the expected post-login URL

      cy.visit('/driverApplication'); 

      cy.get('#sponsorSelect').select('Test Sponsor');
      cy.get('#notes').type('This is a test for driver applications.');
      cy.get('#submitApp').click();

  
      // Verify success notification
      cy.contains('Sponsor Name: Test Sponsor').should('be.visible');
    });
  });
  


/*
    SPONSOR:
    Creates a new user within organization.
*/
describe('[S] Creates new user within sponsor organization.', () => {


    it('Should log in, navigate to Add User page, and successfully add a user', () => {
        // Visit the login page
        cy.visit('/login'); // Adjust this URL to match your login page route
    
        // Fill in the username and password fields
        cy.get('#amplify-id-\\:r2\\:').type('sponsortest'); // Escape the `:` in the id
        cy.get('#amplify-id-\\:r5\\:').type('Password1!'); // Escape the `:` in the id
        
        // Click the login button
        cy.get('.amplify-button--primary').click();


        // Fill in change password fields.
        cy.get('#amplify-id-\\:r8\\:').should('be.visible').type('Password1!');
        cy.get('#amplify-id-\\:rb\\:').type('Password1!');
        cy.get('#amplify-id-\\:re\\:').type('sponsortest');

        // Click the change password button.
        cy.get('.amplify-button--primary').click();

        cy.contains('Skip').should('exist').click();
        
        // Verify successful login
        cy.url().should('include', '/dashboard'); // Adjust this to the expected post-login URL

        // Navigate to the Add User page
        cy.visit('/add-user');

        // Fill out the sponsor form
        cy.get('#fname').type('[Test] SponsUser');
        cy.get('#lname').type('Test');
        cy.get('#email').type('sponsusertest@gmail.com');
        cy.get('#password').type('Password1!');
        cy.get('#phoneNum').type('(555)-123-4567');
        cy.get('#address').type('123 Testing St.');
        cy.get('#city').type('Test City');
        cy.get('#state').type('SC');
        cy.get('#zipCode').type('58712');
        cy.get('#dln').type('2387423678');
        cy.get('#points').type('5000');
        

        // Submit the form
        cy.get('button[type="submit"]').click();
        cy.wait(1000);


        // Verify the user is added in the sponsor list
        cy.visit('/driverList'); // Navigate to the sponsor list page
        cy.contains('[Test] SponsUser').should('exist'); // Check for the newly added user
    });

});



/*
    SPONSOR:
    Accepts incoming application.
*/
describe('[S] Accepts driver application.', () => {

    beforeEach(() => {
        // Use the custom login command to log in before each test
        cy.login('sponsortest', 'Password1!'); // Pass username and password
      });

    it('Should log in, navigate to driverList page, and accept driver application.', () => {
      // Navigate to the driverList page.
      cy.visit('/driverList');

      // Accept incoming application.
      cy.get('#appAccept').click();

      cy.wait(1000);

      // Navigate to the driverList page.
      cy.reload();

      cy.wait(1000);

      // Verify driver was added.
      cy.contains('[Test] Driver').should('be.visible');

    });
  });



/*
    SPONSOR:
    Manages user points.
*/
describe('[S] Manages user points.', () => {


  beforeEach(() => {
      // Use the custom login command to log in before each test
      cy.login('sponsortest', 'Password1!'); // Pass username and password
    });


  it('Should navigate to managePoints page, and add points manually.', () => {
    // Navigate to the managePoints page.
    cy.visit('/managePoints');



    cy.contains('td', '[Test] Driver')
      .click();


    // Fill out the sponsor form
    cy.get('#points').type('15000');
    cy.get('#description').type('This is a test of adding points manually.');
    cy.get('#submitManualPoints').click();

    cy.contains('td', '[Test] Driver')
      .click();

    cy.contains('15000').should('exist');
  });

  it('Should navigate to managePoints page and create a new custom action,', () => {
      // Navigate to the managePoints page.
      cy.visit('/managePoints');

  
      // Fill out the custom actions form.
      cy.get('#actionDescription').type('Test Add');
      cy.get('#actionPoints').type('1000');
      cy.get('#custActionSubmit').click();

      cy.contains('Test')
          .should('exist')
          .click();

      cy.contains('td', '[Test] Driver')
      .click();

      cy.get('#custAction').click();

      cy.contains('16000 points').should('exist');
  });

  it('Should navigate to managePoints page and add a recurring payment.', () => {
  // Navigate to the managePoints page.
  cy.visit('/managePoints');


  // Fill out the custom actions form.
  cy.get('#recPoints').type('-1000');
  cy.get('#recDescription').type('Remove points recurring test.');
  cy.get('#recSubmit').click();

  cy.contains('Remove points recurring test.')
      .should('exist')
      .click();

  cy.contains('td', '[Test] Driver')
  .click();
  cy.contains('16000 points').should('exist');
  cy.get('#deleteRec').click();
  });
});



/*
    SPONSOR:
    Modifies rewards catalog.
*/
describe('[S] Modifies reward catalog.', () => {

  beforeEach(() => {
      // Use the custom login command to log in before each test
      cy.login('sponsortest', 'Password1!'); // Pass username and password
    });


  it('Should navigate to managePoints page, and add points manually.', () => {
    // Navigate to the managePoints page.
    cy.visit('/rewards');

    cy.get('#catCheckbox').click();
    cy.wait(1000);

    cy.get('#savePrefs').click();
    cy.wait(1000);

  });
});

/*
    SPONSOR:
    Adds billing information.

describe('[S] Adds sponsor billing information.', () => {

  beforeEach(() => {
      // Use the custom login command to log in before each test
      cy.login('sponsortest', 'Password1!'); // Pass username and password
    });


  it('Should navigate to managePoints page, and add points manually.', () => {
    // Navigate to the managePoints page.
    cy.visit('/rewards');

    cy.get('#catCheckbox').click();
    cy.wait(1000);

    cy.get('#savePrefs').click();
    cy.wait(1000);

  });
});
*/