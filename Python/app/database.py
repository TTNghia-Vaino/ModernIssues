import psycopg2
import numpy as np
import ast

conn = psycopg2.connect(
    host="localhost",
    dbname="mi-project",
    user="postgres",
    password="123321Es",
    port=5432
)
cursor = conn.cursor()

cursor.execute("SELECT productid, description, embedding, " \
        "price, stock, product_name, warranty_period FROM product WHERE embedding IS NOT NULL and is_disabled = false")

data = cursor.fetchall()

names = [d[5] for d in data]
prices = [d[3] for d in data]
stocks = [d[4] for d in data]
warranties = [d[6] for d in data]

vectors = np.array([np.array(ast.literal_eval(d[2]), dtype=float) for d in data])
