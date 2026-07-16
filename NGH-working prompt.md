# Issues

## Invoice
1. share on whatsapp isn't working
2. I want to have these columns in invoice 
  Description | Actual size (LxW) | Nos | Calculated Size(LxW) | Qty | Rate | Unit | Amount
Actual size should have an option to add lenght and width seperately
We should be able calculate the Calculated size based on the actual size 
for example, 
 - the calculated size for any size under 24" we will calculate in multiples of 3" (e.g., 21.5" becomes 24")
 - the calculated size for any size 24" and above we will calculate in multiples of 6" (e.g., 32" becomes 36")

3. Calculate the qty based on the length and width of the calculated size 

4. Add calculated size and qty as a non-editable field

5. By default it should be sq.ft (change the calculated qty based on the unit)

6. Add "Discount" option at the end along with taxes

7. Add "Transport" & "Packing & Forwarding" options in the invoice footer section which I can add amount same as discount

---

1. Option to udpate the opening balance for a customer
2. I should be able to add the date of when I received the money from a particular customer
3. Have an option to add the receipt without going to the customer and then adding the receipt.
4. Have an option to filter the invoices, recipts for the customer by selecting date range and get the total of the items (Invoice total, opening balance, payment, remaining balance) in that range
5. we should also have a back option on every page so that the user doesn't have the click browser back button, update the dates in the whole application to
  be user readable like (July 26 2026) etc 

---

- The customer details and dashboard doesn't seem right. we have an invoice created but don't see anything reflected in the dashboard or customer details etc.
- update the calendar component to be more user friendly
- update Rs. to be Rupee symbol across the application
- have loading states for search options, invoice, customer etc. 
- have an option to filter the documents for a customer based on month in documents with filter for month which should show documents for that month + total amount for that month + remaining amount etc
- GST report on the dashboard (monthly, yearly and select range)
- Top customer and Documents is also missing on the dashboard 

---

- recent invoice in dashboard has this 2026-07-14
- top customers and documents on the dashboard is empty
- revenue is empty on the dashboard for all time
- invoices this month is empty although I have an invoice created today
- invoices created is showing 0 
- customers shows 0 saved, although I have more than 170 customers
- when does the invoice change from draft to sent etc?
- documents section for the customers have '2026-07' for searching, it should have proper date, month, range etc.
- have the create document button on top right on the dashboard same color as the button on the sidebar

---

- recent invoices in dashboard still has the date as '2026-07-14'
- what's draft for invoice and how do I update the status
- Create Document button in document page should have the same brass color
- same for Add customer button. in general all the primary button should have the same primary color, follow the primary, secondary etc. i.e follow a design system
- have an option to filter or sort the customers 
- can we have an option to search / select customers from a dropdown list which makes it easier to find an existing customer across the application 

---

- why does the document Documents Showing documents for July 2026 section have 2 tabs? this month, last month, quarter, year, and another one with month, quarter and date range. can we fix that to be only one with date range, month, quarter, year?

---
The /accounts page shows 3 stat cards (Total Receivable, Total Invoiced, Total Paid) followed by a table of all customers with their
Opening/Invoiced/Paid/Balance. That's it — no search, no sort options, no filters. It's all server-rendered and the sort is fixed to
balance-due descending.

Here are some ideas to make it better, based on what I've seen in the rest of the codebase:

1. Search customers — Same pattern as the customers page. Search by name, phone, GST from a search input that filters the list.

2. Column sorting — Clickable table headers (Name, Invoiced, Paid, Balance) to sort ascending/descending. Would need to convert the
listing to a client component.

3. Filter presets — Quick chips to narrow the list: "All", "With Outstanding", "Paid in Full", "Overdue" (e.g., balance > 50% of
invoiced). Could also add a minimum balance filter.

4. Per-customer invoice count — Show how many invoices they have, similar to the customers page.

5. Mobile cards — The table works on desktop but on mobile it scrolls horizontally. Card layout like the documents page would be better.

6. Pagination — If you have lots of customers, paginate instead of loading all at once.

7. Clickable row → ledger — Already exists (name links to customer ledger), but could make the whole row clickable.


---

I've seen various components have various style like some have hard corners some have rounded corners and similar to buttons and dropdowns etc. can we fix that and have a design system applied to all the components, all components should have a similar styling and follow the same design system


---

1. Remove create receipt in documents, it is treating a recipt like an invoice
2. In new invoice page, first line should be Customer (select or create new - which should open new customer modal - which should have all the fields to create a customer including opening balance in the same modal), this should be at the top, after select customer, the remaining fields should appear below that
3. Make the record payment modal/popup more user friendly
4. Remove the create receipt from ledger page
5. I would like to have a receipt for the customer's payment which I can sent it to them like we do for invoice.
6. 

---

- Opening balance should in ledger
- show Rupee symbol in all the currency fields
- Have an option to add polish charges, bevel charges, hardware, labour etc as an additional item to the customer which we can have control to enter the amount for the document as some document may have it some might not.
- we should have an option to edit, delete a payment record

---

- Update window quotation.
- Automatically generate cutting sheet of how to cut which glass sizes from the sheets in stock

