describe('Add Sponsor Page', () => {
  beforeEach(() => {
    cy.visit('/add-sponsor');
  });

  it('should prevent access for non-admin users', () => {
    // Mock a non-admin session
    cy.intercept('GET', '/auth-session', { body: { groups: ['Drivers'] } });
    cy.contains('You do not have permission to add sponsors.').should('be.visible');
  });

  it('should allow admins to submit sponsor details', () => {
    // Mock an admin session
    cy.intercept('GET', '/auth-session', { body: { groups: ['Admins'] } });

    cy.get('input#sponsorName').type('Test Sponsor');
    cy.get('input#sponsorAddress').type('123 Main St');
    cy.get('input#city').type('Clemson');
    cy.get('input#state').type('SC');
    cy.get('input#zipCode').type('29634');
    cy.get('input#phoneNum').type('555-555-5555');
    cy.get('input#email').type('test@sponsor.com');
    cy.get('input#pointsPerUnit').type('10');

    cy.get('button').contains('Add Sponsor').click();

    // Mock DynamoDB response
    cy.intercept('POST', '/dynamodb-put', { statusCode: 200 });

    cy.contains('Sponsor added successfully!').should('be.visible');
  });
});
