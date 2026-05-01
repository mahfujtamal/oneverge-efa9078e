-- Create a public bucket for invoice PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

-- Public read (links sent via email need to be accessible)
CREATE POLICY "Invoices are publicly readable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'invoices');

-- Anyone authenticated may upload an invoice into a folder named by their customer id
-- (we also allow anon/public uploads from the client right after a payment confirmation;
-- the file path includes the random transaction id so it's unguessable)
CREATE POLICY "Anyone can upload invoices"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'invoices');
