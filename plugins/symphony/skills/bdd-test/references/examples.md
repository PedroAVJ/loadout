# Examples

## Web UI example (modal confirmation)

```md
Feature: catalog / delete category

Given the app is running
And I am signed in as a business owner
And a category named "Vestidos de Noche" exists

When I go to the catalog section
And I open the articles menu
And I delete the "Vestidos de Noche" category

Then I should see a deletion confirmation

When I cancel
Then the confirmation should disappear

When I delete the "Vestidos de Noche" category
And I confirm
Then the confirmation should disappear
And "Vestidos de Noche" should no longer appear in the articles menu
```

## API example (create + fetch + error case)

```md
Feature: api / create invoice

Given the API server is running
And I am authenticated as an admin

When I create an invoice with a valid payload
Then I should receive a success response with an id

When I fetch that invoice
Then I should receive the invoice I created

When I create an invoice with an invalid payload
Then I should receive a validation error
```
