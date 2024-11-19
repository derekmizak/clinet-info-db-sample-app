
# **Visit Logs Application**

This is a Node.js application that logs client information, including IP, browser details, and visit timestamps, to a PostgreSQL database. It allows filtering and viewing logs in a paginated table format.

This guide explains how to deploy the application to **Google Cloud App Engine** with **Cloud SQL for PostgreSQL** and **Secret Manager** for secure configuration.

---

## **Features**
- Logs client information to a PostgreSQL database.
- Displays logs in a paginated table with filters (date range, records per page).
- Uses Google Cloud Secret Manager for secure configuration.
- Designed for deployment on Google Cloud App Engine with Cloud SQL.

---

## **Local Setup**

### **1. Prerequisites**
- Node.js and npm installed on your system.
- Docker installed and running (for local PostgreSQL).
- Google Cloud CLI installed and authenticated.

---

### **2. Clone the Repository**
```bash
git clone <repository-url>
cd <repository-folder>
```

---

### **3. Set Up Environment Variables**
Create a `.env` file in the project root with the following content:
```bash
POSTGRES_USER=secure_user
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=client_info
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}
```

---

### **4. Start PostgreSQL Locally**
Create a `docker-compose.yml` file in the root directory with the following content:
```yaml
version: "3.8"
services:
  db:
    image: postgres:latest
    container_name: postgres_db
    environment:
      POSTGRES_USER: secure_user
      POSTGRES_PASSWORD: secure_password
      POSTGRES_DB: client_info
    ports:
      - "5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data

volumes:
  db_data:
```

Run the following command to start PostgreSQL:
```bash
docker compose up -d
```

---

### **5. Install Dependencies**
```bash
npm install
```

---

### **6. Run Migrations**
```bash
npm run migrate
```

---

### **7. Start the Application Locally**
```bash
npm start
```

Visit the application at `http://localhost:8080`.

---

## **Google Cloud Deployment**

### **1. Set Up Google Cloud Project**
1. Create a new project in the [Google Cloud Console](https://console.cloud.google.com/).
2. Note the project ID (e.g., `your-project-id`).

---

### **2. Enable Required Services**
Enable the following services in your project:
```bash
gcloud services enable appengine.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

---

### **3. Set Up App Engine**
Initialize App Engine in your project:
```bash
gcloud app create --region=europe-west2
```

---

### **4. Set Up Cloud SQL**
1. Create a PostgreSQL instance:
   ```bash
   gcloud sql instances create pgsql-instance \
       --database-version=POSTGRES_17 \
       --tier=db-f1-micro \
       --region=europe-west2
   ```

2. Create the database:
   ```bash
   gcloud sql databases create client_info --instance=pgsql-instance
   ```

3. Create a user and password:
   ```bash
   gcloud sql users create secure_user \
       --instance=pgsql-instance \
       --password=secure_password
   ```

---

### **5. Store Database URL in Secret Manager**
Generate the Cloud SQL connection string:
```bash
echo -n "postgresql://secure_user:secure_password@/client_info?host=/cloudsql/<INSTANCE_CONNECTION_NAME>" | \
gcloud secrets create DATABASE_URL --data-file=-
```

Replace `<INSTANCE_CONNECTION_NAME>` with the value obtained from:
```bash
gcloud sql instances describe pgsql-instance --format="value(connectionName)"
```

---

### **6. Grant Secret Manager Permissions**
Grant App Engine default service account access to the secret:
```bash
gcloud secrets add-iam-policy-binding DATABASE_URL \
    --member="serviceAccount:<PROJECT_ID>@appspot.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

Replace `<PROJECT_ID>` with your Google Cloud project ID.

---

### **7. Configure `app.yaml`**
Create a file named `app.yaml` in the project root with the following content:
```yaml
runtime: nodejs20
instance_class: F1
env: standard
automatic_scaling:
  target_cpu_utilization: 0.65
  target_throughput_utilization: 0.75
  max_instances: 2
env_variables:
  NODE_ENV: production
```

Replace `<INSTANCE_CONNECTION_NAME>` with your Cloud SQL instance connection name.

---

### **8. Configure `cloudbuild.yaml`**
Make sure file named `cloudbuild.yaml` in the project root exists - review settings.


---

### **9. Deploy the Application**
1. Push your code to a GitHub repository.
2. Set up a Cloud Build trigger to deploy the app on every commit:
   ```bash
   gcloud beta builds triggers create github \
       --name="deploy-app" \
       --repo-name="<REPO_NAME>" \
       --repo-owner="<OWNER>" \
       --branch-pattern=".*" \
       --build-config="cloudbuild.yaml"
   ```

Replace `<REPO_NAME>` and `<OWNER>` with your GitHub repository details.

3. Commit and push your code:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push
   ```

Cloud Build will automatically deploy the application to App Engine.

---

### **10. Test the Deployed Application**
Visit your deployed application:
```
https://<YOUR_PROJECT_ID>.appspot.com
```

---

## **Cleanup**
To avoid incurring unnecessary costs, clean up the resources:
1. Delete the App Engine app:
   ```bash
   gcloud app services delete default
   ```
2. Delete the Cloud SQL instance:
   ```bash
   gcloud sql instances delete pgsql-instance
   ```
3. Delete the secret:
   ```bash
   gcloud secrets delete DATABASE_URL
   ```
4. Delete the project if no longer needed:
   ```bash
   gcloud projects delete <PROJECT_ID>
   ```

---

## **Troubleshooting**

1. **"Permission Denied" for Secret Manager**:
   - Ensure the App Engine default service account has the `roles/secretmanager.secretAccessor` role.

2. **Database Connection Errors**:
   - Verify the `DATABASE_URL` secret is correct.
   - Ensure the Cloud SQL instance is configured with the correct user, password, and database.

3. **Build Failures**:
   - Check the Cloud Build logs in the Google Cloud Console.

