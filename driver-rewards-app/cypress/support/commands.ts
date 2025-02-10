/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
// declare global {
//   namespace Cypress {
//     interface Chainable {
//       login(email: string, password: string): Chainable<void>
//       drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>
//     }
//   }
// }

/// <reference types="cypress" />

import AWS from 'aws-sdk';

// Extend Cypress Chainable interface
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Logs in using AWS Cognito adminInitiateAuth with CUSTOM_AUTH flow
       * @param username - The username of the user
       */
      login(username: string, password: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('login', (username: string, password: string) => {
    // Visit the login page
    cy.visit('/login'); // Adjust this URL to match your login page route
  
    // Fill in the username and password fields
    cy.get('#amplify-id-\\:r2\\:').type(username); // Escape the `:` in the id
    cy.get('#amplify-id-\\:r5\\:').type(password); // Escape the `:` in the id
  
    // Click the login button
    cy.get('.amplify-button--primary').click();

    cy.contains('Skip').should('exist').click();

    // Click the login button
    //cy.get('.amplify-button--small').click();
  
    // Verify successful login
    cy.url().should('include', '/dashboard'); // Adjust this to the expected post-login URL
  });
  
  
  

// Export for module augmentation
export {};
