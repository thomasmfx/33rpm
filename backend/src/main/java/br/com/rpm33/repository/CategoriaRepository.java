package br.com.rpm33.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.rpm33.model.Categoria;

public interface CategoriaRepository extends JpaRepository<Categoria, Long> {

  Optional<Categoria> findByDescIgnoreCaseAndTipo(String desc, String tipo);
}
