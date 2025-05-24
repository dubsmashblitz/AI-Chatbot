# Use an official OpenJDK runtime as a parent image
FROM openjdk:11-jre-slim

# Set working directory
WORKDIR /app

# Install curl and unzip
RUN apt-get update && apt-get install -y curl unzip

# Download and extract LanguageTool
RUN curl -L -o LanguageTool-latest-snapshot.zip https://internal1.languagetool.org/snapshots/LanguageTool-stable-snapshot.zip && \
    unzip LanguageTool-latest-snapshot.zip -d languagetool_server && \
    rm LanguageTool-latest-snapshot.zip

# Navigate into the LanguageTool directory
# The exact directory name will include the version/date, so use a wildcard
WORKDIR /app/languagetool_server/LanguageTool-*

# Create an empty server.properties file
RUN touch server.properties

# Expose port 8081
EXPOSE 8081

# Command to run the LanguageTool server
CMD ["java", "-cp", "languagetool-server.jar", "org.languagetool.server.HTTPServer", "--config", "server.properties", "--port", "8081", "--allow-origin", "*"]
