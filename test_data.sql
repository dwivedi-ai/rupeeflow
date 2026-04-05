-- Test data for RupeeFlow application

-- Insert a test user
INSERT INTO users (id, google_id, email, full_name, avatar_url, role) 
VALUES (
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    'test_google_123456',
    'test@example.com',
    'Test User',
    'https://example.com/avatar.jpg',
    'MEMBER'
) ON CONFLICT (google_id) DO NOTHING;

-- Insert sample transactions
INSERT INTO transactions (user_id, amount, description, type, transaction_date, category) VALUES
('550e8400-e29b-41d4-a716-446655440000'::uuid, 5000.00, 'Monthly Salary', 'INCOME', '2025-07-01', 'Salary'),
('550e8400-e29b-41d4-a716-446655440000'::uuid, 1200.00, 'Grocery Shopping', 'EXPENSE', '2025-07-02', 'Food'),
('550e8400-e29b-41d4-a716-446655440000'::uuid, 800.00, 'Electricity Bill', 'EXPENSE', '2025-07-03', 'Utilities'),
('550e8400-e29b-41d4-a716-446655440000'::uuid, 2000.00, 'Freelance Project', 'INCOME', '2025-07-05', 'Freelance'),
('550e8400-e29b-41d4-a716-446655440000'::uuid, 350.00, 'Coffee Shop', 'EXPENSE', '2025-07-06', 'Food'),
('550e8400-e29b-41d4-a716-446655440000'::uuid, 1500.00, 'Rent Payment', 'EXPENSE', '2025-07-07', 'Housing'),
('550e8400-e29b-41d4-a716-446655440000'::uuid, 500.00, 'Investment Return', 'INCOME', '2025-07-08', 'Investment'),
('550e8400-e29b-41d4-a716-446655440000'::uuid, 250.00, 'Gas Station', 'EXPENSE', '2025-07-09', 'Transportation'),
('550e8400-e29b-41d4-a716-446655440000'::uuid, 150.00, 'Movie Tickets', 'EXPENSE', '2025-07-10', 'Entertainment'),
('550e8400-e29b-41d4-a716-446655440000'::uuid, 3000.00, 'Bonus Payment', 'INCOME', '2025-07-15', 'Salary');
