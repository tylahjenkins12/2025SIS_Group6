# TODO: ADD FRONTEND CONTAINER DEPLOYMENT 


# BACKEND CONTAINER DEPLOYMENT 
# Use a slim Python image for the final, lightweight server
FROM python:3.11-slim

# Set the working directory to a dedicated folder inside the container
# This is where all subsequent commands will run from
WORKDIR /usr/src/app

# Copy the requirements file first and install dependencies
# This is a good practice to leverage Docker's build cache
COPY ./backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Now, copy only the `app` directory, which contains your application code
# This ensures that the Python module path (`app.main:app`) is correct
COPY ./backend/app ./app

# Expose the port that the application will run on
EXPOSE 8080

# The command to run the application
# uvicorn will find the `app` module in the working directory
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
